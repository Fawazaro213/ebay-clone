import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ThirdwebProvider } from "@thirdweb-dev/react";
import network from '../utils/network';
import toast, { Toaster } from 'react-hot-toast';

function MyApp({ Component, pageProps }: AppProps) {
  return (
  <ThirdwebProvider desiredChainId={network}>
  <Component {...pageProps} />
  <Toaster position="top-center" reverseOrder={false} />
  </ThirdwebProvider>
  )
}

export default MyApp
