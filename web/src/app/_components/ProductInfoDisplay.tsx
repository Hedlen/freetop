"use client";

import { useMemo } from "react";
import { cn } from "~/core/utils";
import { Markdown } from "./Markdown";

interface ProductInfo {
  name?: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  rating?: string;
  reviews?: string;
  brand?: string;
  category?: string;
  features?: string[];
  availability?: string;
  description?: string;
}

interface ProductInfoDisplayProps {
  content: string;
  className?: string;
}

export function ProductInfoDisplay({ content, className }: ProductInfoDisplayProps) {
  const productInfo = useMemo(() => {
    return parseProductInfo(content);
  }, [content]);

  const parseProductInfo = (text: string): ProductInfo => {
    // 解析商品名称
    const namePattern = /(?:商品名称?|产品名称?|Product)[：:]?\s*([^\n\r]+)/gi;
    const nameMatch = namePattern.exec(text);
    const name = nameMatch?.[1]?.trim();

    // 解析价格
    const pricePattern = /(?:价格|Price)[：:]?\s*[￥¥$]?([\d,]+(?:\.\d{2})?)/gi;
    const priceMatch = pricePattern.exec(text);
    const price = priceMatch?.[1];

    // 解析原价
    const originalPricePattern = /(?:原价|Original Price)[：:]?\s*[￥¥$]?([\d,]+(?:\.\d{2})?)/gi;
    const originalPriceMatch = originalPricePattern.exec(text);
    const originalPrice = originalPriceMatch?.[1];

    // 解析折扣
    const discountPattern = /(?:折扣|Discount)[：:]?\s*([\d.]+%?)/gi;
    const discountMatch = discountPattern.exec(text);
    const discount = discountMatch?.[1];

    // 解析评分
    const ratingPattern = /(?:评分|Rating)[：:]?\s*([\d.]+)/gi;
    const ratingMatch = ratingPattern.exec(text);
    const rating = ratingMatch?.[1];

    // 解析评论数
    const reviewsPattern = /(?:评论|Reviews?)[：:]?\s*([\d,]+)/gi;
    const reviewsMatch = reviewsPattern.exec(text);
    const reviews = reviewsMatch?.[1];

    // 解析品牌
    const brandPattern = /(?:品牌|Brand)[：:]?\s*([^\n\r]+)/gi;
    const brandMatch = brandPattern.exec(text);
    const brand = brandMatch?.[1]?.trim();

    // 解析分类
    const categoryPattern = /(?:分类|Category)[：:]?\s*([^\n\r]+)/gi;
    const categoryMatch = categoryPattern.exec(text);
    const category = categoryMatch?.[1]?.trim();

    // 解析特性
    const featuresPattern = /(?:特性|Features?)[：:]?\s*([^\n\r]+)/gi;
    const featuresMatch = featuresPattern.exec(text);
    const features = featuresMatch?.[1]?.split(/[,，、]/).map(f => f.trim()).filter(Boolean);

    // 解析库存状态
    const availabilityPattern = /(?:库存|Stock|Availability)[：:]?\s*([^\n\r]+)/gi;
    const availabilityMatch = availabilityPattern.exec(text);
    const availability = availabilityMatch?.[1]?.trim();

    return {
      name,
      price,
      originalPrice,
      discount,
      rating,
      reviews,
      brand,
      category,
      features,
      availability,
      description: text,
    };
  };

  const hasProductData = productInfo.name || productInfo.price || productInfo.brand;

  if (!hasProductData) {
    return (
      <div className={cn("prose max-w-none", className)}>
        <Markdown>{content}</Markdown>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* 商品卡片 */}
      <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="rounded-full bg-purple-100 p-3">
              <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">
                {productInfo.name || "商品信息"}
              </h3>
              
              {/* 品牌和分类 */}
              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                {productInfo.brand && (
                  <div className="flex items-center">
                    <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>{productInfo.brand}</span>
                  </div>
                )}
                {productInfo.category && (
                  <div className="flex items-center">
                    <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>{productInfo.category}</span>
                  </div>
                )}
              </div>
              
              {/* 评分和评论 */}
              {productInfo.rating && (
                <div className="mt-2 flex items-center space-x-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < Math.floor(parseFloat(productInfo.rating!))
                            ? "text-yellow-400"
                            : "text-gray-300"
                        )}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-1 text-sm font-medium text-gray-700">
                      {productInfo.rating}
                    </span>
                    {productInfo.reviews && (
                      <span className="text-sm text-gray-500">
                        ({productInfo.reviews} 评论)
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* 库存状态 */}
              {productInfo.availability && (
                <div className="mt-2">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                    productInfo.availability.includes("有货") || productInfo.availability.includes("现货")
                      ? "bg-green-100 text-green-800"
                      : productInfo.availability.includes("缺货") || productInfo.availability.includes("售罄")
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  )}>
                    {productInfo.availability}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* 价格信息 */}
          <div className="text-right">
            {productInfo.price && (
              <div>
                <p className="text-3xl font-bold text-purple-600">¥{productInfo.price}</p>
                {productInfo.originalPrice && productInfo.originalPrice !== productInfo.price && (
                  <p className="text-sm text-gray-500 line-through">¥{productInfo.originalPrice}</p>
                )}
                {productInfo.discount && (
                  <span className="inline-block rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                    {productInfo.discount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 商品特性 */}
        {productInfo.features && productInfo.features.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 font-medium text-gray-900">商品特性</h4>
            <div className="flex flex-wrap gap-2">
              {productInfo.features.map((feature, index) => (
                <span
                  key={index}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 详细描述 */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h4 className="mb-2 font-medium text-gray-900">详细信息</h4>
        <div className="prose max-w-none text-sm">
          <Markdown>{content}</Markdown>
        </div>
      </div>
    </div>
  );
}