import { checkVideoMirror } from '@/services/api';

export const checKMirrorAndStorageVideo = async () => {
  const savedMediaInfo: { type: string; name: string; id: string } = JSON.parse(
    localStorage.getItem('mediaInfo') ?? '{}'
  );
  const res = await checkVideoMirror();
  const isSameVideo = savedMediaInfo.id !== '' && res !== null && res.id === savedMediaInfo.id;

  return { isSameVideo, videoInfo: savedMediaInfo };
};
