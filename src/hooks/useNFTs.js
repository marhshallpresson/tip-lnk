import { useState, useCallback } from 'react';
import { solanaRpc } from '../config';

const DOODLES_COLLECTION = 'DoodlesCollection';

export function useNFTs() {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNFTs = useCallback(async (walletAddress) => {
    setLoading(true);
    setError(null);

    try {
      // Use QuickNode's DAS API (getAssetsByOwner) to query NFTs
      const result = await solanaRpc('getAssetsByOwner', {
        ownerAddress: walletAddress,
        page: 1,
        limit: 50,
        displayOptions: {
          showCollectionMetadata: true,
          showFungible: false,
        },
      });

      if (result && result.items && result.items.length > 0) {
        const mapped = result.items
          .filter((item) => item.content?.metadata?.name)
          .map((item) => {
            const name = item.content.metadata.name || 'Unknown NFT';
            const image =
              item.content.links?.image ||
              item.content.files?.[0]?.uri ||
              '';
            const collectionName =
              item.content.metadata?.collection?.name ||
              item.grouping?.find((g) => g.group_key === 'collection')
                ?.collection_metadata?.name ||
              'Unknown Collection';

            const isDoodle =
              name.toLowerCase().includes('doodle') ||
              collectionName.toLowerCase().includes('doodle');

            return {
              id: item.id,
              name,
              image,
              collection: collectionName,
              isDoodle,
            };
          });

        // Sort: Doodles first
        mapped.sort((a, b) => (b.isDoodle ? 1 : 0) - (a.isDoodle ? 1 : 0));
        setNfts(mapped);
      } else {
        setNfts([]);
      }
    } catch (err) {
      console.error('NFT fetch error:', err);
      setNfts([]);
      setError('Could not fetch NFTs');
    } finally {
      setLoading(false);
    }
  }, []);

  return { nfts, loading, error, fetchNFTs };
}