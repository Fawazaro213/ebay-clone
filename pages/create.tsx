import React, { FormEvent, useState } from 'react';
import Header from '../components/header';
import { 
    useAddress, 
    useContract,
    MediaRenderer,
    useNetwork,
    useNetworkMismatch,
    useOwnedNFTs,
    useCreateAuctionListing,
    useCreateDirectListing,
} from "@thirdweb-dev/react";
import { ChainId, NFT, NATIVE_TOKENS, NATIVE_TOKEN_ADDRESS, } from '@thirdweb-dev/sdk';
import network from '../utils/network';
import Router, { useRouter } from 'next/router';


type Props = {}

export default function Create({}: Props) {
    const address = useAddress();
    const router = useRouter();
    const { contract } = useContract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT,
        'marketplace'
    );

    const { contract: collectionContract } = useContract(
        process.env.NEXT_PUBLIC_COLLECTION_CONTRACT,
        'nft-collection'
    );

    const [ selectedNft, setSelectedNft ] = useState<NFT>();

    const ownedNFTs = useOwnedNFTs( collectionContract, address);

    const networkMismatch = useNetworkMismatch();
    const [, switchNetwork] = useNetwork();

    const { 
        mutate: createDirectListing, 
        isLoading, 
        error
    } = useCreateDirectListing(contract);

    const { 
        mutate: createAuctionListing, 
        isLoading: isLoadingDirect, 
        error: errorDirect 
    } = useCreateAuctionListing(contract);

    const handleCreateListing = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (networkMismatch) {
            switchNetwork && switchNetwork(network);
            return;
        };

        if (!selectedNft) return;

        const target = e.target as typeof e.target & {
            elements: { ListingType: { value: string }, price: {value: string} };
        };

        const { ListingType, price } = target.elements;

        if (ListingType.value === 'directListing') {
            createDirectListing({
                assetContractAddress: process.env.NEXT_PUBLIC_COLLECTION_CONTRACT!,
                tokenId: selectedNft.metadata.id,
                currencyContractAddress: NATIVE_TOKEN_ADDRESS, 
                listingDurationInSeconds: 60 * 60 * 24 * 7, //1 week
                quantity: 1,
                buyoutPricePerToken: price.value,
                startTimestamp: new Date()
            }, {
                onSuccess(data, variables, context) {
                    console.log('SUCCESS: ', data, variables, context);
                    router.push('/');
                },
                onError(error, variables, context) {
                    console.log('ERROR: ', error, variables, context);
                }
            });
        };

        if (ListingType.value === 'auctionListing') {
            createAuctionListing({
                assetContractAddress: process.env.NEXT_PUBLIC_COLLECTION_CONTRACT!,
                tokenId: selectedNft.metadata.id,
                currencyContractAddress: NATIVE_TOKEN_ADDRESS, 
                listingDurationInSeconds: 60 * 60 * 24 * 7, //1 week
                quantity: 1,
                buyoutPricePerToken: price.value,
                startTimestamp: new Date(),
                reservePricePerToken: 0
            }, {
                onSuccess(data, variables, context) {
                console.log('SUCCESS: ', data, variables, context);
                router.push('/');
            },
            onError(error, variables, context) {
                console.log('ERROR: ', error, variables, context);
            }
        });
    }};
   
  return (
    <div>
        <Header />
        <main className='max-w-6xl mx-auto p-10 pt-2'>
            <h1 className='text-4xl font-bold '>List an Item</h1>
            <h2 className='text-xl font-semibold pt-5'>Select an item you would like to sell</h2>

            <hr />

            <p>Below you will find the NFTs you own in your wallet</p>

            <div className='flex overflow-x-scroll space-x-2 p-4'>
                {ownedNFTs?.data?.map(nft => (
                    <div
                     onClick={ () => setSelectedNft(nft)}
                     key={nft.metadata.id}
                     className={`flex-col space-y-2 card min-w-fit border-2 bg-gray-100 ${nft.metadata.id === selectedNft?.metadata.id ? "border-black" : 'border-transparent'}`}
                     >
                        <MediaRenderer className='h-48 rounded-lg' src={nft.metadata.image} />
                        <p className='text-lg font-bold truncate'>{nft.metadata.description}</p>
                        <p className='text-xs truncate'>{nft.metadata.name}</p>
                    </div>
                ))}
            </div>
                    
            {selectedNft && (
                <form onSubmit={ handleCreateListing }>
                    <div className='flex flex-col p-10'>
                        <div className='grid grid-cols-2 gap-5'>
                            <label className='border-r font-light'>Direct Listing / Fixed Price</label>
                            <input type="radio" name='ListingType'
                            value='directListing'
                            className='ml-auto h-10 w-10'
                            />

                            <label className='border-r font-light'>Auction</label>
                            <input type="radio" name='ListingType'
                            value='auctionListing'
                            className='ml-auto h-10 w-10'
                            />

                            <label className='border-r font-light'>Price</label>
                            <input type="text" placeholder='0.05'
                            className='bg-gray-100 p-5'
                            name='price'
                            />
                        </div>

                        <button type='submit' className='bg-blue-600 text-white rounded-l p-4 mt-8'>Create Listing</button>
                    </div>
                </form>
            )}
        </main>
    </div>
  )};