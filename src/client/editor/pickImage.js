/**
 * Local image picker → data URL. Lives in the editor layer (not ui/) because it
 * touches the DOM/FileReader; ui/ stays props-only.
 */
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Pick a local image and hand it back as a data URL (stored inside the document). */
export function chooseImageFile({ onPick, onError }) {
  if (typeof document === 'undefined') return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > IMAGE_MAX_BYTES) {
      onError();
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => onPick(String(reader.result || '')));
    reader.readAsDataURL(file);
  });
  input.click();
}
