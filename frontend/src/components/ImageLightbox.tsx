import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
  type PanInfo,
} from 'motion/react';

// Apple's momentum projection: where a flick would come to rest.
function project(initialVelocity: number, decelerationRate = 0.999) {
  return (initialVelocity / 1000) * (decelerationRate / (1 - decelerationRate));
}

const DISMISS_THRESHOLD = 140;

// Full-screen image viewer. The image can be grabbed and flung in any
// direction; a flick's projected endpoint decides whether it dismisses,
// and the image springs back home otherwise. Drag distance fades the image.
export function ImageLightbox({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string;
  alt: string;
  caption?: string;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-DISMISS_THRESHOLD * 2, 0, DISMISS_THRESHOLD * 2], [0.2, 1, 0.2]);
  const scale = useTransform(y, [-DISMISS_THRESHOLD * 2, 0, DISMISS_THRESHOLD * 2], [0.9, 1, 0.9]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const projected = info.offset.y + project(info.velocity.y);
    if (Math.abs(projected) > DISMISS_THRESHOLD) {
      onClose();
    } else {
      animate(y, 0, { type: 'spring', bounce: 0.2, duration: 0.4 });
    }
  };

  return createPortal(
    <div
      className="glass-scrim fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-scrim cursor-zoom-out"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-all"
      >
        <X size={20} strokeWidth={2.5} />
      </button>
      <div className="max-w-full max-h-full animate-materialize" onClick={(e) => e.stopPropagation()}>
        <motion.figure
          drag={reduce ? false : 'y'}
          dragElastic={1}
          dragMomentum={false}
          onDragEnd={onDragEnd}
          style={reduce ? undefined : { y, opacity, scale }}
          className="flex flex-col items-center cursor-grab active:cursor-grabbing"
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="max-w-full max-h-[85vh] object-contain rounded-lg select-none pointer-events-none"
          />
          {caption && (
            <figcaption className="mt-3 text-center text-sm text-white/80 max-w-2xl">
              {caption}
            </figcaption>
          )}
        </motion.figure>
      </div>
    </div>,
    document.body
  );
}
