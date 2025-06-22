export interface ISource {
  reference: string;
  page?: number | string; // page can be number for books, or string for other things
  refType?: 'book' | 'youtube' | 'paper';
  videoTitle?: string;
  videoUrl?: string;
  timestamp?: number; // in seconds
}

export interface IMessage {
  id: string;
  chatId?: string;
  role: "user" | "assistant";
  content: string | { 
    answer: string;
    sources: ISource[];
  };
} 