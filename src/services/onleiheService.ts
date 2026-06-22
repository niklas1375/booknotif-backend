const ONLEIHE_API_URL = 'https://api.onleihe.de';

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
  // Store tokens per library ID
  private accessTokens: Map<string, { token: string; expiry: number }> = new Map();

  /**
   * Authenticate with Onleihe API and get access token for a specific library
   * @param onleiheId The Onleihe library ID
   */
  private async authenticate(onleiheId: string): Promise<string> {
    // Check if we have a valid token for this library
    const cached = this.accessTokens.get(onleiheId);
    if (cached && Date.now() < cached.expiry) {
      return cached.token;
    }

    try {
      const response = await fetch(`${ONLEIHE_API_URL}/user-application/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onleiheId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Onleihe authentication failed for ${onleiheId}: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as OnleiheAuthResponse;
      const token = data.accessToken;
      // Set token expiry to 10 minutes from now (adjust as needed)
      const expiry = Date.now() + 600000;

      this.accessTokens.set(onleiheId, { token, expiry });

      return token;
    } catch (error) {
      console.error(`Error authenticating with Onleihe library ${onleiheId}:`, error);
      throw error;
    }
  }

  /**
   * Search for a book in a specific Onleihe library by title and author
   * @param onleiheId The Onleihe library ID
   * @param title Book title
   * @param authorName Author name
   * @returns True if book is found in Onleihe, false otherwise
   */
  async searchBook(onleiheId: string, title: string, authorName: string): Promise<boolean> {
    try {
      const token = await this.authenticate(onleiheId);

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
        `${ONLEIHE_API_URL}/ui/v1/onleihe/${onleiheId}/search`,
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
        console.error(`Onleihe search failed for library ${onleiheId}: ${response.status} ${response.statusText}`);
        return false;
      }

      const data = await response.json() as OnleiheSearchResult;
      
      // Check if we found any results
      if (data.content && data.content.length > 0) {
        console.log(`Found "${title}" by ${authorName} in Onleihe library ${onleiheId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error searching Onleihe library ${onleiheId} for "${title}" by ${authorName}:`, error);
      return false;
    }
  }

  /**
   * Check if a book exists in a specific Onleihe library
   * @param onleiheId The Onleihe library ID
   * @param title Book title
   * @param authorName Author name
   * @returns True if book exists in Onleihe
   */
  async isBookAvailable(onleiheId: string, title: string, authorName: string): Promise<boolean> {
    return this.searchBook(onleiheId, title, authorName);
  }
}

export const onleiheService = new OnleiheService();
