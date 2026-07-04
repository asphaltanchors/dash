import { BusinessCockpitPage } from '@/features/business-cockpit/business-cockpit-page'
import { getBusinessCockpitPageData } from '@/features/business-cockpit/page-data'

export default async function HomePage() {
  const data = await getBusinessCockpitPageData()

  return <BusinessCockpitPage data={data} />
}
