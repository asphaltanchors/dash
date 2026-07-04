import { ProductsOverviewPage } from '@/features/products-overview/products-overview-page'
import { getProductsOverviewPageData } from '@/features/products-overview/page-data'

interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const data = await getProductsOverviewPageData(params)

  return <ProductsOverviewPage data={data} />
}
