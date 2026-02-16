
export function getImageUrl(imageIdentifier) {
    if (!imageIdentifier) return undefined;

    // Check for full URLs (http, https) or data URIs and return them directly.
    if (imageIdentifier.startsWith('http') || imageIdentifier.startsWith('data:')) {
        return imageIdentifier;
    }
    
    // If it's not a valid URL or data URI, return undefined.
    // This handles legacy or invalid data gracefully.
    return undefined;
}
