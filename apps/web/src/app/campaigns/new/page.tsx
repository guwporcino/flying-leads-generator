import type { Metadata } from 'next';
import { CampaignForm } from './campaign-form';

export const metadata: Metadata = {
  title: 'Nova campanha — Flying Leads Generator',
};

export default function NewCampaignPage() {
  return <CampaignForm />;
}
