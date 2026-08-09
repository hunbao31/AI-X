// Multipart requests: these fields arrive as strings on @Body() alongside
// the file on @UploadedFile(); validated manually in ForumService (this
// codebase doesn't use class-validator decorators anywhere else either).

export class CreateForumPostDto {
  description?: string;
  topicId?: string;
  classId?: string;
}

export class CreateForumAnswerDto {
  postId!: string;
  content!: string;
}

export type ForumSort = 'newest' | 'most_answered' | 'most_rewarded';

export interface ForumFeedQuery {
  sort?: string;
  topicId?: string;
  classId?: string;
  page?: string;
  limit?: string;
}
