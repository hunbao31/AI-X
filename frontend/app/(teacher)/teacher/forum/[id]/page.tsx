'use client';

import { useParams } from 'next/navigation';
import { ForumPostDetail } from '@/components/forum/ForumPostDetail';

export default function TeacherForumPostPage() {
  const params = useParams<{ id: string }>();
  return <ForumPostDetail postId={params.id} basePath="/teacher/forum" />;
}
