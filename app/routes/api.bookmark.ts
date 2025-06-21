import { json, type ActionFunctionArgs } from '@remix-run/node'
import { getAuth } from '@clerk/remix/ssr.server'
import { db } from '~/db'
import { bookmarks } from '~/db/schema'
import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export const loader = () => {
  return json({ status: 'you should not be here' }, 404)
}

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args)
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await args.request.formData()
  const messageId = formData.get('messageId')

  if (!messageId || typeof messageId !== 'string') {
    return json({ error: 'Message ID is required' }, { status: 400 })
  }

  try {
    const existingBookmark = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.userId, userId),
        eq(bookmarks.messageId, messageId),
      ),
    })

    if (existingBookmark) {
      await db.delete(bookmarks).where(eq(bookmarks.id, existingBookmark.id))
      return json({ success: true, bookmarked: false })
    } else {
      await db.insert(bookmarks).values({
        id: `bkmk_${nanoid()}`,
        userId,
        messageId,
      })
      return json({ success: true, bookmarked: true })
    }
  } catch (error) {
    console.error('Bookmark action failed:', error)
    return json({ error: 'Failed to update bookmark' }, { status: 500 })
  }
} 