import { useState, useCallback } from 'react';
import { solanaRpc } from '../config';

const DOODLES_COLLECTION = 'DoodlesCollection';

// Seed NFTs for demonstration when wallet has no Doodles NFTs
const SEED_NFTS = [
  {
    id: 'doodle-1',
    name: 'Doodle #6914',
    image: 'https://i.seadn.io/gae/7B0qai02OdHA8P_EOVK672qUliyjQdQDGNrACxs7WnTgZAkJa_wWURnIFKeOh5VTf8cfTqW3wQpozGedaC9mteKphEOtztls02RlWQ?w=500',
    collection: 'Doodles',
    isDoodle: true,
  },
  {
    id: 'doodle-2',
    name: 'Doodle #2489',
    image: 'https://i.seadn.io/gae/nUPFUhkMmYtW0nDy8xNE9PVSYHKl2VFnUGYoX3RH0_FjM1h3P5C8VRvLvNjXGHNqGXa8U5wX_EQLvL7X_TDcaNuMzAt?w=500',
    collection: 'Doodles',
    isDoodle: true,
  },
  {
    id: 'doodle-3',
    name: 'Doodle #8821',
    image: 'https://i.seadn.io/gae/AvSp3SBGMEGPMkPfJCMBpJWVBDVXxL_R3BYLOxw23jGrOc3cFg-MSnPMnSjRGYeFNvOJFNuAzcQ5P_6skbJQ7Q?w=500',
    collection: 'Doodles',
    isDoodle: true,
  },
  {
    id: 'smb-1',
    name: 'SMB #4421',
    image: 'https://arweave.net/1234placeholder',
    collection: 'Solana Monkey Business',
    isDoodle: false,
  },
  {
    id: 'degod-1',
    name: 'DeGod #7712',
    image: 'https://arweave.net/5678placeholder',
    collection: 'DeGods',
    isDoodle: false,
  },
];

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
            const collection =
              item.grouping?.find((g) => g.group_key === 'collection')
                ?.group_value || '';
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
        setNfts(mapped.length > 0 ? mapped : SEED_NFTS);
      } else {
        // No NFTs found — use seed data for demo
        setNfts(SEED_NFTS);
      }
    } catch (err) {
      console.error('NFT fetch error:', err);
      // Fallback to seed NFTs so the app remains functional
      setNfts(SEED_NFTS);
      setError('Using demo NFTs — live fetch encountered an error.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { nfts, loading, error, fetchNFTs };
}
