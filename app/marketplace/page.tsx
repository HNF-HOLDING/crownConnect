import { AwsMarketplace } from './aws-marketplace';
import { PortalHeader } from '../portal-header';

export default function Marketplace() {
  return (
    <>
      <PortalHeader portal="customer" />
      <AwsMarketplace />
    </>
  );
}
