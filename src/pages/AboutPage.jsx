
import placeholderImages from '../lib/placeholder-images.json';

export default function AboutPage() {
  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <header className="mb-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight font-headline md:text-6xl text-foreground">
            Our Story
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
            Celebrating artistry, community, and the beauty of the handmade.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="relative aspect-square rounded-lg overflow-hidden">
             <img 
                src={placeholderImages.aboutArtisan.src}
                alt="Artisan working"
                className="object-cover w-full h-full"
                data-ai-hint={placeholderImages.aboutArtisan.hint}
              />
          </div>
          <div className="space-y-6 text-foreground">
            <h2 className="text-3xl font-bold font-headline">From a Dream to a Marketplace</h2>
            <p className="text-muted-foreground leading-relaxed">
              Craftly was born from a simple yet powerful idea: to create a dedicated space where the soul of craftsmanship could be discovered, cherished, and shared. In a world dominated by mass production, we felt a calling to champion the unique magic that lives within every handmade item—a magic infused with the passion, skill, and story of its creator.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our journey began with a small collective of artisans and a shared vision. Today, while we've grown into a bustling marketplace, our core values remain unchanged. Every product you find here is a testament to quality, creativity, and the enduring appeal of items made by hand.
            </p>
          </div>
        </div>

        <div className="mt-24 py-20 bg-secondary rounded-lg text-center">
           <h2 className="text-3xl font-bold font-headline mb-4 text-foreground">Our Philosophy</h2>
           <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            We are committed to fostering a sustainable and ethical ecosystem. We empower local artisans, promote responsible sourcing of materials, and ensure that every purchase contributes to a cycle of creativity and community empowerment. Thank you for being a part of our story and for supporting the artisans who make Craftly possible.
           </p>
        </div>
      </div>
    </div>
  );
}
