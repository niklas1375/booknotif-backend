const ONLEIHE_API_URL = 'https://api.onleihe.de';
const ONLEIHE_ID = process.env.ONLEIHE_ID;

interface OnleiheAuthResponse {
  accessToken: string;
}

interface OnleiheSearchResult {
  content: Array<{
    productId: string;
    title: string;
    authors?: string[];
  }>;
  totalElements: number;
}

export class OnleiheService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Authenticate with Onleihe API and get access token
   */
  private async authenticate(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`${ONLEIHE_API_URL}/user-application/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onleiheId: ONLEIHE_ID,
        }),
      });

      if (!response.ok) {
        throw new Error(`Onleihe authentication failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as OnleiheAuthResponse;
      this.accessToken = data.accessToken;
      // Set token expiry to 10 minutes from now (adjust as needed)
      this.tokenExpiry = Date.now() + 600000;

      return this.accessToken;
    } catch (error) {
      console.error('Error authenticating with Onleihe:', error);
      throw error;
    }
  }

  /**
   * Search for a book in Onleihe by title and author
   * @param title Book title
   * @param authorName Author name
   * @returns True if book is found in Onleihe, false otherwise
   */
  async searchBook(title: string, authorName: string): Promise<boolean> {
    try {
      const token = await this.authenticate();

      const searchBody = {
        facets: [
          {
            field: 'licence.isAvailable',
          },
        ],
        from: 0,
        postFilters: [
          {
            field: 'mediaType',
            operator: 'OR',
            type: 'TERMS',
            values: ['E_BOOK'],
          },
          {
            field: 'authors_fullName',
            operator: 'OR',
            type: 'TERMS',
            values: [authorName],
          },
        ],
        query: [
          {
            fields: [],
            isExact: false,
            operator: 'AND',
            query: title,
          },
        ],
        size: 20,
        userLanguage: 'de_DE',
      };

      const response = await fetch(
        `${ONLEIHE_API_URL}/ui/v1/onleihe/${ONLEIHE_ID}/search`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchBody),
        }
      );

      if (!response.ok) {
        console.error(`Onleihe search failed: ${response.status} ${response.statusText}`);
        return false;
      }

      const data = await response.json() as OnleiheSearchResult;
      
      // Check if we found any results
      if (data.content && data.content.length > 0) {
        console.log(`Found "${title}" by ${authorName} in Onleihe`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error searching Onleihe for "${title}" by ${authorName}:`, error);
      return false;
    }
  }

  /**
   * Check if a book exists in Onleihe (wrapper for searchBook)
   * @param title Book title
   * @param authorName Author name
   * @returns True if book exists in Onleihe
   */
  async isBookAvailable(title: string, authorName: string): Promise<boolean> {
    return this.searchBook(title, authorName);
  }
}

export const onleiheService = new OnleiheService();