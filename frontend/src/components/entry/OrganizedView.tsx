import { format } from 'date-fns';
import { Film, Image as ImageIcon, MessageSquare, Mic, Music } from 'lucide-react';
import type { JournalEntry } from '@cloudchat/shared';
import {
  extractSpotifyLinks,
  spotifyEmbedUrl,
  stripSpotifyLinks,
  type SpotifyLink,
} from '~/lib/spotify';
import { AnnotatedImage } from './AnnotatedImage';
import { VoiceBubble } from './Bubbles';
import { EmptyDay } from './EmptyDay';
import { sectionId, whatsappMemos } from './shared';

export function OrganizedView({ entry }: { entry: JournalEntry }) {
  const songs: SpotifyLink[] = entry.messages.flatMap((m) => extractSpotifyLinks(m.content));
  const textMessages = entry.messages.filter((m) => stripSpotifyLinks(m.content).length > 0);

  const videos = entry.videos ?? [];
  // Pocket recordings get their own block at the bottom of the page.
  const memos = whatsappMemos(entry);
  const isEmpty =
    songs.length === 0 &&
    entry.images.length === 0 &&
    memos.length === 0 &&
    videos.length === 0 &&
    textMessages.length === 0;

  if (isEmpty) return <EmptyDay />;

  return (
    <div className="space-y-8 stagger">
      {textMessages.length > 0 && (
        <Section id={sectionId('messages')} icon={MessageSquare} title="Messages" count={textMessages.length}>
          <div className="space-y-2">
            {textMessages.map((m) => (
              <div key={m.id} className="rounded-xl bg-sunken text-strong px-4 py-2.5">
                <p className="text-[15px] leading-relaxed">{stripSpotifyLinks(m.content)}</p>
                <p className="text-xs mt-1 text-faint">{format(new Date(m.timestamp), 'HH:mm')}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {entry.images.length > 0 && (
        <Section id={sectionId('images')} icon={ImageIcon} title="Images" count={entry.images.length}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {entry.images.map((img) => (
              <AnnotatedImage
                key={img.id}
                image={img}
                date={entry.date}
                className="aspect-square rounded-xl bg-sunken"
              />
            ))}
          </div>
        </Section>
      )}

      {videos.length > 0 && (
        <Section id={sectionId('videos')} icon={Film} title="Videos" count={videos.length}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {videos.map((video) => (
              <video
                key={video.id}
                controls
                preload="metadata"
                src={video.url}
                className="w-full rounded-xl bg-black"
              />
            ))}
          </div>
        </Section>
      )}

      {memos.length > 0 && (
        <Section id={sectionId('memos')} icon={Mic} title="Voice memos" count={memos.length}>
          <div className="space-y-2">
            {memos.map((memo) => (
              <VoiceBubble key={memo.id} memo={memo} date={entry.date} align="left" />
            ))}
          </div>
        </Section>
      )}

      {songs.length > 0 && (
        <Section id={sectionId('songs')} icon={Music} title="Songs" count={songs.length}>
          <div className="space-y-2">
            {songs.map((link) => (
              <iframe
                key={`${link.kind}:${link.id}`}
                src={spotifyEmbedUrl(link)}
                title="Spotify player"
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className={`w-full rounded-xl border-0 ${link.kind === 'track' || link.kind === 'episode' ? 'h-[152px]' : 'h-[352px]'}`}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  count,
  children,
}: {
  id: string;
  icon: typeof Music;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} strokeWidth={2} className="text-faint" />
        <h2 className="text-xs font-medium tracking-wide uppercase text-faint">{title}</h2>
        <span className="text-xs text-faintest">{count}</span>
      </div>
      {children}
    </section>
  );
}
