const DB_NAME = 'renew-health-documents'
const STORE_NAME = 'previews'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveHealthDocumentPreview(documentId, file) {
  if (!documentId || !file || typeof indexedDB === 'undefined') return
  const database = await openDatabase()
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(file, String(documentId))
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

export async function loadHealthDocumentPreviews(documentIds) {
  if (typeof indexedDB === 'undefined' || !documentIds.length) return new Map()
  const database = await openDatabase()
  const entries = await Promise.all(documentIds.map((documentId) => new Promise((resolve) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(String(documentId))
    request.onsuccess = () => resolve([String(documentId), request.result || null])
    request.onerror = () => resolve([String(documentId), null])
  })))
  database.close()
  return new Map(entries)
}
