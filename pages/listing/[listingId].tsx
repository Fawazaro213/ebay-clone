import { UserCircleIcon } from '@heroicons/react/24/solid';
import {
   MediaRenderer, 
   useContract, 
   useListing, 
   useNetwork, 
   useNetworkMismatch,
   useBuyNow,
   useMakeOffer,
   useOffers,
   useMakeBid,
   useAddress,
   useAcceptDirectListingOffer
  } from '@thirdweb-dev/react';
import { ListingType, NATIVE_TOKENS } from '@thirdweb-dev/sdk';
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import Header from '../../components/header';
import Countdown from 'react-countdown';
import network from '../../utils/network';
import { ethers } from 'ethers';
import toast, { Toaster } from 'react-hot-toast';

function ListingPage() {
    const address = useAddress();
    const router = useRouter();
    const { listingId } = router.query as { listingId: string };
    const [bidAmount, setBidAmount] = useState('');
    const networkMismatch = useNetworkMismatch();
    const [, switchNetwork] = useNetwork(); 

    const [ minimumNextBid, setMinimumNextBid ] = useState<{
    displayValue: string;
    symbol: string
  }>();

  const { contract } = useContract(
    process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT,
    'marketplace'
    );

    const { mutate: acceptOffer } = useAcceptDirectListingOffer(contract);
  
    const { mutate: makeBid } = useMakeBid(contract);
  
    const { data: offers } = useOffers(contract, listingId);

    console.log(offers)

    const { mutate: makeOffer } = useMakeOffer(contract);
  
    const { mutate: buyNow } = useBuyNow(contract);

    const { data: listing, isLoading, error } = useListing(contract, listingId);

  useEffect(() => {
    if (!listingId || !contract || !listing) return;

    if (listing.type === ListingType.Auction) {
      fetchMinNextBid();
    }
  }, [listingId, listing, contract]);

  console.log(minimumNextBid)

  const fetchMinNextBid = async () => {
    if (!listingId || !contract) return;

    const {displayValue, symbol} = await contract.auction.getMinimumNextBid(
      listingId
      );

    setMinimumNextBid({
      displayValue: displayValue,
      symbol: symbol,
    })
  }

  const formatPlaceholder = () => {
    if (!listing) return;

    if (listing.type === ListingType.Direct) {
    return "Enter Offer Amount";
  };

    if (listing.type === ListingType.Auction) {
    if (!minimumNextBid?.displayValue)
    return Number(minimumNextBid?.displayValue) === 0 
    ? 'Enter Bid Amount'
    : `${minimumNextBid?.displayValue} ${minimumNextBid?.symbol} or more`;
  }
  };

  const buyNft = async () => {
    if (networkMismatch) {
      switchNetwork && switchNetwork(network);
      return;
    }

    if (!listing || !contract || !listingId) return;
    toast.loading("Buying NFT...");

    await buyNow({
      id: listingId,
      buyAmount: 1,
      type: listing.type
    }, {
      onSuccess(data, variables, context) {
        toast.dismiss();
        toast.success("NFT bought successfully!");
        console.log('SUCCESS', data, variables, context);
        router.replace("/");
      },
      onError(error, variables, context) {
        toast.dismiss();
        toast.error("ERROR: NFT could not be bought.")
        console.log("ERROR", error, variables, context);
      }
    })
  };

  // Direct listing
  const createBidOrOffer = async () => {
    try {
        if (networkMismatch) {
          switchNetwork && switchNetwork(network);
          return;
        }

        if (listing?.type === ListingType.Direct) {
          if (listing.buyoutPrice.toString() ===
           ethers.utils.parseEther(bidAmount).toString()) {
            buyNft();
            return
          }

          console.log("Buy out Price was not met, making offer...");
          toast.loading('Making offer...');

          await makeOffer({
            listingId,
            quantity: 1,
            pricePerToken: bidAmount
          }, {
            onSuccess(data, variables, context) {
              toast.dismiss();
              toast.success("Offer bought successfully!");
              console.log('SUCCESS', data, variables, context);
              setBidAmount('');
            },
            onError(error, variables, context) {
              toast.dismiss();
              toast.error("ERROR: Offer could not be bought.")
              console.log("ERROR", error, variables, context);
            }
          })
        }

        // Auction listing
        if (listing?.type === ListingType.Auction) {
          toast.loading('Making Bid...')
          console.log("Making Bid...");

          await makeBid({
            listingId,
            bid: bidAmount,
          }, {
            onSuccess(data, variables, context) {
              toast.dismiss();
              toast.success('Bid made successfully!');
              console.log('SUCCESS', data, variables, context);
            },
            onError(error, variables, context) {
              toast.dismiss();
              toast.error('ERROR: could not Bid');
              console.log("ERROR", error, variables, context);
            }
          })
        }

    } catch (error) {
      console.log(error)
    }
  }

  if (!listing) {
    return (
      <div>
        <Header />
        <div className='text-center animate-pluse text-blue-500'>
          <p>Loading Item...</p>
          </div>
        </div>
        );
  };

  return (
    <div className='bg-gradient-to-r from-gray-400 to-white-500'>
        <Header />
        <main className='max-w-6xl 
        mx-auto p-2 flex flex-col 
        h-screen
        lg:flex-row 
        space-y-10 space-x-5 pr-10'>
          <div className='p-10 border mx-auto lg:mx-0 max-w-md lg:max-w-xl'>
            <MediaRenderer src={listing.asset.image} />
          </div>

          <section className='flex-1 space-y-5 pb-20 lg:pb-0'>
            <div>
              <h1 className='text-xl font-bold'>{listing.asset.name}</h1>
              <p className='text-gray-600'>{listing.asset.description}</p>
              <p className='flex space-x-1 items-center text-xs sm:text-base'>
                <UserCircleIcon className='h-5 '/>
                <span className='font-bold pr-2'>Seller: </span>
                {listing.sellerAddress}</p>
            </div>

            <div className='grid grid-cols-2 items-center py-2'>
              <p className='font-bold'>Listing Type:</p>
              <p className=''>
                {listing.type === ListingType.Direct 
              ? "Direct Listing" 
              : "Auction Listing"}
              </p>

              <p className='font-bold'>Buy it Now Price:</p>
              <p className='text-4xl font-bold'>
              {listing.buyoutCurrencyValuePerToken.displayValue} 
              <br />
              {listing.buyoutCurrencyValuePerToken.symbol}
              </p>

              <button onClick={buyNft} className='col-start-2 mt-2 bg-blue-600 
              font-bold text-white rounded-full w-44 py-4 px-10'>
                Buy Now
              </button>
            </div>

            {listing.type === ListingType.Direct && offers && (
              <div className='grid grid-cols-2 gap-y-2'>
                <p className='font-bold'>Offers: </p>
                <p className='font-bold'>
                  {offers.length > 0 ? offers.length : 0}
                </p>
  
                  {offers.map(offer => (
                    <>
                    <p className='flex items-center ml-5 text-sm italic'>
                      <UserCircleIcon className='h-3 mr-2' />
                      {offer.offeror.slice(0, 5) 
                      + "..." 
                      + offer.offeror.slice(-5)}
                    </p>
                      <p
                      key={
                        offer.listingId +
                        offer.offerer +
                        offer.totalOfferAmount.toString()
                      }
                       className='flex justify-between w-50 text-sm italic'>
                        {ethers.utils.formatEther(offer.totalOfferAmount)}{""}
                        {NATIVE_TOKENS[network].symbol}

                        {listing.sellerAddress === address &&(
                        <button
                        onClick={() => {
                          acceptOffer({
                            listingId,
                            addressOfOfferor: offer.offeror,
                          }, {
                            onSuccess(data, variables, context) {
                              toast.dismiss()
                              toast.success('Offer accepted successfully!');
                              console.log('SUCCESS', data, variables, context);
                              router.replace('/');
                            },
                            onError(error, variables, context) {
                              toast.dismiss()
                              toast.error('ERROR: Offer could not be accepted');
                              console.log("ERROR", error, variables, context);
                            }
                          });

                        }}
                        className='p-2 w-32 bg-red-500/50 rounded-lg font-bold 
                        text-xs cursor-pointer'>
                          Accept Offer
                        </button>
                      )}
                      </p>
                    </>
                  ))}
              </div>
            )}

            <div className="grid grid-cols-2 space-y-2 items-center justify-end">
              <hr className='col-span-2'/>
              <p className='col-span-2 font-bold'>
                {listing.type === ListingType.Direct 
              ? "Make an Offer" 
              : "Bid on this Auction"}
              </p>

              {listing.type === ListingType.Auction && (
                <>
                  <p>Current Minimum Bid:</p>
                  <p className='font-bold'>
                    {minimumNextBid?.displayValue} 
                    {minimumNextBid?.symbol}
                    </p>

                  <p>Time Remaning: </p>
                  <Countdown 
                  date = {Number(listing.endTimeInEpochSeconds.toString()) 
                    * 1000}
                  />
                </>
              )}

              <input 
              onChange={(e) =>  setBidAmount(e.target.value)}
              className='border p-2 rounded-lg mr-5 outline-red-500' 
              type="text" 
              placeholder={formatPlaceholder()}
              />
              <button onClick={createBidOrOffer}
              className='bg-red-600 font-bold 
              text-white rounded-full w-44 py-4 px-10
              active:scale-125 transition-transform duration-300'>
                {listing.type === ListingType.Direct 
                ? 'Offer' 
                : 'Bid'}
                </button>
            </div>
          </section>
        </main>
    </div>
  )
}

export default ListingPage;

function saveSettings(settings: any): Promise<unknown> {
  throw new Error('Function not implemented.');
}
