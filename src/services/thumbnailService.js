import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { writeFile, unlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const FFMPEG_PATH = ffmpegStatic;
const FFPROBE_PATH = ffprobeInstaller.path;

ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);

export const ThumbnailService = {
  async generar({ buffer, mimeType }) {
    if (!buffer || buffer.length === 0) return null;

    const ext = (mimeType?.split('/')[1] || 'mp4').replace(/[^a-z0-9]/gi, '');
    const id = randomUUID();
    const tmpInput = join(tmpdir(), `thumb-in-${id}.${ext}`);
    const outName = `thumb-out-${id}.jpg`;
    const tmpOutput = join(tmpdir(), outName);

    try {
      await writeFile(tmpInput, buffer);

      await new Promise((resolve, reject) => {
        const command = ffmpeg(tmpInput);
        command.setFfmpegPath(FFMPEG_PATH);
        command.setFfprobePath(FFPROBE_PATH);

        command
          .on('end', resolve)
          .on('error', reject)
          .screenshots({
            timestamps: ['10%'],
            filename: outName,
            folder: tmpdir(),
            size: '640x?',
          });
      });

      return await readFile(tmpOutput);
    } catch (err) {
      console.error('No se pudo generar thumbnail del video:', err.message);
      return null;
    } finally {
      try { await unlink(tmpInput); } catch {}
      try { await unlink(tmpOutput); } catch {}
    }
  },
};
