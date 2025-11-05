"use client";

import { useMemo } from "react";

import { cn } from "~/core/utils";

import { Markdown } from "./Markdown";

interface HotelInfo {
  name?: string;
  price?: string;
  rating?: string;
  location?: string;
  amenities?: string[];
  images?: string[];
  description?: string;
}

interface HotelInfoDisplayProps {
  content: string;
  className?: string;
}

export function HotelInfoDisplay({ content, className }: HotelInfoDisplayProps) {
  const parseHotelInfo = (text: string): HotelInfo => {
    // 解析酒店名称
    const namePattern = /(?:酒店名称?[：:]?|Hotel[：:]?)\s*([^\n\r]+)/gi;
    const nameMatch = namePattern.exec(text);
    const name = nameMatch?.[1]?.trim();

    // 解析价格
    const pricePattern = /(?:价格|Price)[：:]?\s*[￥¥$]?([\d,]+)/gi;
    const priceMatch = pricePattern.exec(text);
    const price = priceMatch?.[1];

    // 解析评分
    const ratingPattern = /(?:评分|Rating)[：:]?\s*([\d.]+)/gi;
    const ratingMatch = ratingPattern.exec(text);
    const rating = ratingMatch?.[1];

    // 解析位置
    const locationPattern = /(?:位置|地址|Location)[：:]?\s*([^\n\r]+)/gi;
    const locationMatch = locationPattern.exec(text);
    const location = locationMatch?.[1]?.trim();

    // 解析设施
    const amenitiesPattern = /(?:设施|Amenities)[：:]?\s*([^\n\r]+)/gi;
    const amenitiesMatch = amenitiesPattern.exec(text);
    const amenities = amenitiesMatch?.[1]?.split(/[,，、]/).map(a => a.trim()).filter(Boolean);

    return {
      name,
      price,
      rating,
      location,
      amenities,
      description: text,
    };
  };

  const hotelInfo = useMemo(() => {
    return parseHotelInfo(content);
  }, [content]);

  const hasHotelData = (hotelInfo.name ?? hotelInfo.price ?? hotelInfo.rating) ? true : false;

  if (!hasHotelData) {
    return (
      <div className={cn("prose max-w-none", className)}>
        <Markdown>{content}</Markdown>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* 酒店卡片 */}
      <div className="rounded-lg border border-gray-200/60 bg-gradient-to-r from-gray-50/80 to-blue-50/60 p-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="rounded-full bg-blue-100/80 p-2">
              <svg className="h-4 w-4 text-blue-600/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text;base font-bold text-gray-900">
                {hotelInfo.name ?? "酒店信息"}
              </h3>
              {hotelInfo.location && (
                <div className="mt-1 flex items-center text-gray-600">
                  <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs">{hotelInfo.location}</span>
                </div>
              )}
              {hotelInfo.rating && (
                <div className="mt-1 flex items-center">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < Math.floor(parseFloat(hotelInfo.rating!))
                            ? "text-yellow-400"
                            : "text-gray-300"
                        )}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-1 text-xs font-medium text-gray-700">
                      {hotelInfo.rating}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          {hotelInfo.price && (
            <div className="text-right">
              <p className="text-lg font-bold text-blue-600/90">¥{hotelInfo.price}</p>
              <p className="text-xs text-gray-500">每晚起</p>
            </div>
          )}
        </div>

        {/* 设施信息 */}
        {hotelInfo.amenities && hotelInfo.amenities.length > 0 && (
          <div className="mt-2">
            <h4 className="mb-1 text-sm font-medium text-gray-900">酒店设施</h4>
            <div className="flex flex-wrap gap-1">
              {hotelInfo.amenities.map((amenity, index) => (
                <span
                  key={index}
                  className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm border border-gray-200/50"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 详细描述 */}
      <div className="rounded-lg bg-gray-50/60 p-2 backdrop-blur-sm border border-gray-200/40">
        <h4 className="mb-2 font-medium text-gray-900">详细信息</h4>
        <div className="prose max-w-none text-sm">
          <Markdown>{content}</Markdown>
        </div>
      </div>
    </div>
  );
}