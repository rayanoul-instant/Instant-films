import faviconLogo from '@/assets/avatar-logo.png';
const ACC = (path: string) => new URL(`../../assets/accessories/${path}`, import.meta.url).href;
import { cn } from '@/lib/utils';

// hue-rotate offsets from the logo's base purple (H≈262°)
export const AVATAR_COLORS = [
  { id: 'purple', value: '#7C3AED', label: 'Purple',  hue: 0    },
  { id: 'blue',   value: '#2563EB', label: 'Blue',    hue: -41  },
  { id: 'green',  value: '#16A34A', label: 'Green',   hue: -120 },
  { id: 'red',    value: '#DC2626', label: 'Red',     hue: 98   },
  { id: 'orange', value: '#EA580C', label: 'Orange',  hue: 119  },
  { id: 'pink',   value: '#DB2777', label: 'Pink',    hue: 66   },
  { id: 'teal',   value: '#0D9488', label: 'Teal',    hue: -85  },
  { id: 'yellow', value: '#CA8A04', label: 'Yellow',  hue: 139  },
];

export const AVATAR_HATS = [
  { id: 'none',  label: 'Aucun',           image: null                        },
  { id: 'hat1',  label: 'Hat 1',           image: ACC('hats/hat1.png')        },
  { id: 'hat2',  label: 'Hat 2',           image: ACC('hats/hat2.png')        },
  { id: 'hat3',  label: 'Hat 3',           image: ACC('hats/hat3.png')        },
  { id: 'h3',    label: 'Chapeau pirate',  image: ACC('hats/3.png')           },
  { id: 'h8',    label: 'Chapeau 8',       image: ACC('hats/8.png')           },
  { id: 'h9',    label: 'Chapeau 9',       image: ACC('hats/9.png')           },
  { id: 'h13',   label: 'Robin Hood',      image: ACC('hats/13.png')          },
  { id: 'h14',   label: 'Chapeau 14',      image: ACC('hats/14.png')          },
  { id: 'h15',   label: 'Casque sci-fi',   image: ACC('hats/15.png')          },
];

export const AVATAR_GLASSES = [
  { id: 'none',   label: 'Aucun',      image: null                      },
  { id: 'glas1',  label: 'Glasses 1',  image: ACC('glasses/glas1.png')  },
  { id: 'glas2',  label: 'Glasses 2',  image: ACC('glasses/glas2.png')  },
];

export const AVATAR_MASKS = [
  { id: 'none',   label: 'Aucun',              image: null,                      screen: false },
  { id: 'mask1',  label: 'Mask 1',             image: ACC('masks/mask1.png'),    screen: false },
  { id: 'mask2',  label: 'Mask 2',             image: ACC('masks/mask2.png'),    screen: false },
  { id: 'mask3',  label: 'Mask 3',             image: ACC('masks/mask3.png'),    screen: false },
  { id: 'm6',     label: 'Masque 6',           image: ACC('masks/6.png'),        screen: false },
  { id: 'm11',    label: 'Viking',             image: ACC('masks/11.png'),       screen: true  },
  { id: 'm17',    label: 'Masque 17',          image: ACC('masks/17.png'),       screen: false },
  { id: 'm21',    label: 'Plongée profonde',   image: ACC('masks/21.png'),       screen: true  },
];

export const AVATAR_BODY = [
  { id: 'none',  label: 'Aucun',              image: null,                    screen: false },
  { id: 'b1',   label: 'Harnais plongée',    image: ACC('body/1.png'),       screen: false },
  { id: 'b4',   label: 'Équipement sci-fi',  image: ACC('body/4.png'),       screen: true  },
  { id: 'b5',   label: 'Gilet tactique',     image: ACC('body/5.png'),       screen: false },
  { id: 'b7',   label: 'Corps 7',            image: ACC('body/7.png'),       screen: false },
  { id: 'b10',  label: 'Corps 10',           image: ACC('body/10.png'),      screen: false },
  { id: 'b12',  label: 'Corps 12',           image: ACC('body/12.png'),      screen: false },
  { id: 'b16',  label: 'Astronaute',         image: ACC('body/16.png'),      screen: false },
  { id: 'b18',  label: 'Corps 18',           image: ACC('body/18.png'),      screen: false },
  { id: 'b19',  label: 'Corps 19',           image: ACC('body/19.png'),      screen: false },
];

// Keep for backwards compat
export const AVATAR_FACE = AVATAR_MASKS;
export const AVATAR_EXTRAS = [{ id: 'none', label: 'None', image: null }];

interface AvatarDisplayProps {
  color?: string;
  hat?: string;
  glasses?: string;
  mask?: string;
  body?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm:  'w-6',
  md:  'w-10',
  lg:  'w-16',
  xl:  'w-24',
};

export function AvatarDisplay({ color = '#7C3AED', hat, glasses, mask, body, size = 'md', className }: AvatarDisplayProps) {
  const width = sizeMap[size];

  const hue = AVATAR_COLORS.find(c => c.value === color)?.hue ?? 0;

  const hatItem     = AVATAR_HATS.find(h => h.id === hat);
  const glassesItem = AVATAR_GLASSES.find(g => g.id === glasses);
  const maskItem    = AVATAR_MASKS.find(m => m.id === mask);
  const bodyItem    = AVATAR_BODY.find(b => b.id === body);

  return (
    <div className={cn('relative flex-shrink-0 inline-block', width, className)}>
      {/* Base avatar — hue-rotate for color */}
      <img
        src={faviconLogo}
        alt="Avatar"
        className="w-full h-auto block"
        style={hue !== 0 ? { filter: `hue-rotate(${hue}deg)` } : undefined}
      />

      {/* Body — overlays the stem of the i */}
      {bodyItem?.image && (
        <img
          src={bodyItem.image}
          alt={bodyItem.label}
          className="absolute pointer-events-none"
          style={{
            width: '120%',
            left: '-10%',
            top: '30%',
            mixBlendMode: bodyItem.screen ? 'screen' : 'normal',
          }}
        />
      )}

      {/* Hat — on top of the head */}
      {hatItem?.image && (
        <img
          src={hatItem.image}
          alt={hatItem.label}
          className="absolute pointer-events-none"
          style={{ width: '62%', left: '19%', top: '-22%' }}
        />
      )}

      {/* Glasses — eye area */}
      {glassesItem?.image && (
        <img
          src={glassesItem.image}
          alt={glassesItem.label}
          className="absolute pointer-events-none"
          style={{ width: '41%', left: '30%', top: '3%' }}
        />
      )}

      {/* Mask — covers whole face */}
      {maskItem?.image && (
        <img
          src={maskItem.image}
          alt={maskItem.label}
          className="absolute pointer-events-none"
          style={{
            width: '62%',
            left: '19%',
            top: '-2%',
            mixBlendMode: maskItem.screen ? 'screen' : 'normal',
          }}
        />
      )}
    </div>
  );
}
