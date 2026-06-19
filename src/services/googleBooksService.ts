const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

export interface GoogleBookVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

export interface GoogleBooksResponse {
  items?: GoogleBookVolume[];
  totalItems: number;
}

export class GoogleBooksService {
  /**
   * Search for books by author name
   * @param authorName The name of the author to search for
   * @param maxResults Maximum number of results to return (default: 10)
   * @returns Array of book volumes
   */
  async searchBooksByAuthor(
    authorName: string,
    maxResults: number = 10
  ): Promise<GoogleBookVolume[]> {
    try {
      const params = new URLSearchParams({
        q: `inauthor:"${authorName}"`,
        orderBy: 'newest',
        printType: 'books',
        maxResults: maxResults.toString(),
        key: API_KEY || '',
      });

      const response = await fetch(`${GOOGLE_BOOKS_API_URL}?${params}`);
      
      if (!response.ok) {
        console.error(`Error fetching books for author ${authorName}: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as GoogleBooksResponse;
      return data.items || [];
    } catch (error) {
      console.error(`Unexpected error fetching books for author ${authorName}:`, error);
      return [];
    }
  }

  /**
   * Extract ISBN from book volume
   * @param volume Google Books volume
   * @returns ISBN-13 or ISBN-10, or null if not found
   */
  extractISBN(volume: GoogleBookVolume): string | null {
    const identifiers = volume.volumeInfo.industryIdentifiers;
    if (!identifiers) return null;

    // Prefer ISBN-13 over ISBN-10
    const isbn13 = identifiers.find((id) => id.type === 'ISBN_13');
    if (isbn13) return isbn13.identifier;

    const isbn10 = identifiers.find((id) => id.type === 'ISBN_10');
    if (isbn10) return isbn10.identifier;

    return null;
  }

  /**
   * Get the most recent book for an author
   * @param authorName The name of the author
   * @returns The most recent book or null if none found
   */
  async getMostRecentBook(authorName: string): Promise<GoogleBookVolume | null> {
    const books = await this.searchBooksByAuthor(authorName, 1);
    return books.length > 0 ? books[0] : null;
  }
}

export const googleBooksService = new GoogleBooksService();