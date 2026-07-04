import { notFound } from 'next/navigation'
import { ProductDetailPage } from '@/features/product-detail/product-detail-page'
import { getProductDetailPageData } from '@/features/product-detail/page-data'

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProductDetailRoute({ params, searchParams }: ProductDetailPageProps) {
  const { slug } = await params
  const productName = decodeURIComponent(slug)
  const searchParamsObj = await searchParams
  const data = await getProductDetailPageData(productName, searchParamsObj)

  if (!data) {
    notFound()
  }

  return <ProductDetailPage data={data} />
}
