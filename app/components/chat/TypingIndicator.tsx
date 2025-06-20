export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 p-4">
      <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
    </div>
  );
} 