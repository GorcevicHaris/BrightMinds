export default function Loading() {
    return (
        <div className="grid min-h-dvh place-items-center bg-canvas" role="status" aria-label="Učitavanje">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        </div>
    );
}
