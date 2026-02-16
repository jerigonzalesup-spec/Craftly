
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';

export function ProductImageCarousel({ product }) {
  const [api, setApi] = useState();
  const [current, setCurrent] = useState(0);

  const productImages = useMemo(() => {
      return product.images
        .map(idOrUrl => getImageUrl(idOrUrl))
        .filter((url) => !!url);
  }, [product.images]);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const handleThumbnailClick = (index) => {
    api?.scrollTo(index);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Carousel setApi={setApi}>
            <CarouselContent>
              {productImages.map((imageUrl, index) => (
                <CarouselItem key={index}>
                  <div className="aspect-square relative">
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={`${product.name} image ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {productImages.length > 1 && <>
                <CarouselPrevious className="absolute left-4" />
                <CarouselNext className="absolute right-4" />
            </>}
          </Carousel>
        </CardContent>
      </Card>
      
      {productImages.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
            {productImages.map((imageUrl, index) => (
                imageUrl && <div 
                    key={index} 
                    className={cn(
                        "aspect-square relative rounded-md border-2 cursor-pointer transition-all",
                        index === current ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
                    )}
                    onClick={() => handleThumbnailClick(index)}
                >
                    <img
                        src={imageUrl}
                        alt={`Thumbnail ${index + 1}`}
                        className="object-cover w-full h-full"
                    />
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
