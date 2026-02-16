
export class FirestorePermissionError extends Error {
    constructor(context) {
        const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify({
            context
        }, null, 2)}`;

        super(message);
        this.name = 'FirestorePermissionError';
        this.context = context;
        Object.setPrototypeOf(this, FirestorePermissionError.prototype);
    }
}
