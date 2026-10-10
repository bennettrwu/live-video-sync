interface VideoSurfaceProps {
  onElement: (element: HTMLVideoElement | null) => void;
}

/** The bare video element. Controls and overlays live around it. */
export function VideoSurface({ onElement }: VideoSurfaceProps) {
  return (
    <video
      ref={onElement}
      playsInline
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        objectFit: 'contain',
        backgroundColor: 'black',
      }}
    />
  );
}
