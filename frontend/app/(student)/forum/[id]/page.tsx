'use client';

import { useParams } from 'next/navigation';
import { ForumPostDetail } from '@/components/forum/ForumPostDetail';

export default function StudentForumPostPage() {
  const params = useParams<{ id: string }>();
  return <ForumPostDetail postId={params.id} basePath="/forum" />;
}
