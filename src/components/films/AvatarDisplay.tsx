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
  { id: 'none',    label: 'None',    image: null                  },
  { id: 'hat1',    label: 'Hat 1',   image: ACC('hats/hat1.png')  },
  { id: 'hat2',    label: 'Hat 2',   image: ACC('hats/hat2.png')  },
  { id: 'hat3',    label: 'Hat 3',   image: ACC('hats/hat3.png')  },
];

export const AVATAR_GLASSES = [
  { id: 'none',    label: 'None',      image: null                       },
  { id: 'glas1',   label: 'Glasses 1', image: ACC('glasses/glas1.png')   },
  { id: 'glas2',   label: 'Glasses 2', image: ACC('glasses/glas2.png')   },
];

export const AVATAR_MASKS = [
  { id: 'none',    label: 'None',    image: null                     },
  { id: 'mask1',   label: 'Mask 1',  image: ACC('masks/mask1.png')   },
  { id: 'mask2',   label: 'Mask 2',  image: ACC('masks/mask2.png')   },
  { id: 'mask3',   label: 'Mask 3',  image: ACC('masks/mask3.png')   },
];

// Keep for backwards compat (AccountPage may still reference it)
export const AVATAR_FACE = AVATAR_MASKS;
export const AVATAR_EXTRAS = [{ id: 'none', label: 'None', image: null }];

interface AvatarDisplayProps {
  color?: string;
  hat?: string;
  glasses?: string;
  mask?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm:  'w-6',
  md:  'w-10',
  lg:  'w-16',
  xl:  'w-24',
};

export function AvatarDisplay({ color = '#7C3AED', hat, glasses, mask, size = 'md', className }: AvatarDisplayProps) {
  const width = sizeMap[size];

  const hue = AVATAR_COLORS.find(c => c.value === color)?.hue ?? 0;
  const activeMask = mask;

  const hatItem     = AVATAR_HATS.find(h => h.id === hat);
  const glassesItem = AVATAR_GLASSES.find(g => g.id === glasses);
  const maskItem    = AVATAR_MASKS.find(m => m.id === activeMask);

  return (
    <div className={cn('relative flex-shrink-0 inline-block', width, className)}>
      {/* Base avatar — hue-rotate for color, white eyes preserved */}
      <img
        src={faviconLogo}
        alt="Avatar"
        className="w-full h-auto block"
        style={hue !== 0 ? { filter: `hue-rotate(${hue}deg)` } : undefined}
      />

      {/* Hat — on top of the head */}
      {hatItem?.image && (
        <img src={hatItem.image} alt={hatItem.label} className="absolute pointer-events-none"
          style={{ width: '62%', left: '19%', top: '-22%' }} />
      )}

      {/* Glasses — eye area */}
      {glassesItem?.image && (
        <img src={glassesItem.image} alt={glassesItem.label} className="absolute pointer-events-none"
          style={{ width: '41%', left: '30%', top: '3%' }} />
      )}

      {/* Mask — covers whole face */}
      {maskItem?.image && (
        <img src={maskItem.image} alt={maskItem.label} className="absolute pointer-events-none"
          style={{ width: '62%', left: '19%', top: '-2%' }} />
      )}
    </div>
  );
}
