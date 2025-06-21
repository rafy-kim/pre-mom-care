import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { getAuth } from '@clerk/remix/ssr.server'
import { db } from '~/db'
import { and, eq, desc } from 'drizzle-orm'
import { bookmarks } from '~/db/schema'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Bookmark } from 'lucide-react'
import { format } from 'date-fns'

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args)
  if (!userId) {
    return json({ bookmarks: [] })
  }

  const userBookmarks = await db.query.bookmarks.findMany({
    where: eq(bookmarks.userId, userId),
    with: {
      message: {
        columns: {
          id: true,
          chatId: true,
          content: true,
        },
      },
    },
    orderBy: [desc(bookmarks.createdAt)],
  })

  return json({ bookmarks: userBookmarks })
}

function getMessagePreview(content: any): string {
  if (typeof content === 'string') {
    return content.substring(0, 100)
  }
  if (typeof content === 'object' && content !== null && 'answer' in content) {
    return (content.answer as string).substring(0, 100)
  }
  return '내용을 표시할 수 없습니다.'
}

export default function BookmarksPage() {
  const { bookmarks } = useLoaderData<typeof loader>()

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <Bookmark className="h-6 w-6" />
        <h1 className="text-2xl font-bold">북마크 목록</h1>
      </div>
      {bookmarks.length > 0 ? (
        <div className="space-y-4">
          {bookmarks.map(bookmark => (
            <Link
              key={bookmark.id}
              to={`/chat/${bookmark.message.chatId}#${bookmark.message.id}`}
              className="block hover:bg-muted/50 rounded-lg"
            >
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(bookmark.createdAt), 'yyyy년 MM월 dd일')}
                  </p>
                  <p className="mt-2 truncate">
                    {getMessagePreview(bookmark.message.content)}...
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-16">
          <Bookmark className="mx-auto h-12 w-12" />
          <p className="mt-4">아직 북마크한 답변이 없어요.</p>
          <p>채팅 답변에 마우스를 올리고 북마크 해보세요!</p>
        </div>
      )}
    </div>
  )
} 