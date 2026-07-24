import faviconLogo from '@/assets/avatar-logo.png';
const ACC = (path: string) => new URL(`../../assets/accessories/${path}`, import.meta.url).href;
import { cn } from '@/lib/utils';

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

type AStyle = { width: string; left: string; top: string; transform?: string; transformOrigin?: string };

type Acc = {
  id: string;
  label: string;
  image: string | null;
  screen?: boolean;
  aStyle?: AStyle;
  thumbOrigin?: string;
  thumbScale?: number;
};

// Avatar container at size xl: 96×120px
// Head: y=8–44px  |  Body: y=52–106px
// All accessories: width 200% = 192px, centered left='-50%'
// top formula: container_target_px - (accessory_top_pct × 192px) then convert to % of 120px

const OLD_HAT:  AStyle = { width: '62%',  left: '19%',     top: '-22%' };
const NEW_HAT:  AStyle = { width: '280%', left: '-11.74%', top: '-9%',  transform: 'scale(1.37)', transformOrigin: '18% 13%' };

const OLD_MASK: AStyle = { width: '62%',  left: '19%',  top: '-2%' };
const NEW_MASK: AStyle = { width: '700%', left: '-18.5%', top: '-8%', transform: 'scale(1.45)', transformOrigin: '8% 10%' };

// Scl: positions image content at the right place then scales from there.
// scale = seul chiffre à modifier pour agrandir/rétrécir (la position reste correcte)
// cx,cy = position du contenu dans l'image en % (mesurée depuis l'image source)
// tY = y cible dans le container px (52=corps avatar, 8=tête avatar)
// tX = x cible dans le container px (défaut 48 = centre)
function Scl(scale: number, cx: number, cy: number, tY = 52, tX = 48): AStyle {
  return {
    width: '100%',
    left: `${(tX / 96 * 100 - cx).toFixed(1)}%`,
    top:  `${((tY - cy / 100 * 96) / 120 * 100).toFixed(1)}%`,
    transform: `scale(${scale})`,
    transformOrigin: `${cx}% ${cy}%`,
  };
}

export const AVATAR_HATS: Acc[] = [
  { id: 'none', label: 'None',          image: null },
  { id: 'hat1', label: 'Hat 1',          image: ACC('hats/hat1.png'), aStyle: OLD_HAT },
  { id: 'hat2', label: 'Hat 2',          image: ACC('hats/hat2.png'), aStyle: OLD_HAT },
  { id: 'hat3', label: 'Hat 3',          image: ACC('hats/hat3.png'), aStyle: OLD_HAT },
  { id: 'h3',   label: 'Beret',          image: ACC('hats/3.png'),    aStyle: NEW_HAT, thumbOrigin: '50% 0%', thumbScale: 2.9 },
  { id: 'h8',   label: 'Hat 8',      image: ACC('hats/8.png'),    aStyle: NEW_HAT, thumbOrigin: '50% 0%', thumbScale: 2.9 },
  { id: 'h9',   label: 'Hat 9',      image: ACC('hats/9.png'),    aStyle: NEW_HAT, thumbOrigin: '50% 0%', thumbScale: 2.9 },
  { id: 'h13',  label: 'Robin Hood',     image: ACC('hats/13.png'),   aStyle: NEW_HAT, thumbOrigin: '50% 0%', thumbScale: 2.9 },
  { id: 'h14',  label: 'Melon',          image: ACC('hats/14.png'),   aStyle: NEW_HAT, thumbOrigin: '50% 0%', thumbScale: 2.9 },
  { id: 'h15',  label: 'Casque sci-fi',  image: ACC('hats/15.png'),   aStyle: NEW_HAT, thumbOrigin: '50% 0%', thumbScale: 2.9 },
];

export const AVATAR_GLASSES: Acc[] = [
  { id: 'none',  label: 'None',      image: null },
  { id: 'glas1', label: 'Glasses 1',  image: ACC('glasses/glas1.png') },
  { id: 'glas2', label: 'Glasses 2',  image: ACC('glasses/glas2.png') },
];

export const AVATAR_MASKS: Acc[] = [
  { id: 'none',  label: 'None',            image: null },
  { id: 'mask1', label: 'Mask 1',           image: ACC('masks/mask1.png'), aStyle: OLD_MASK },
  { id: 'mask2', label: 'Mask 2',           image: ACC('masks/mask2.png'), aStyle: OLD_MASK },
  { id: 'mask3', label: 'Mask 3',           image: ACC('masks/mask3.png'), aStyle: OLD_MASK },
  { id: 'm6',    label: 'Spartiate',        image: ACC('masks/6.png'),     aStyle: NEW_MASK,                thumbOrigin: '50% 10%', thumbScale: 2 },
  { id: 'm11',   label: 'Viking',           image: ACC('masks/11.png'),    aStyle: NEW_MASK, screen: true,  thumbOrigin: '50% 10%', thumbScale: 2 },
  { id: 'm17',   label: 'Deep dive', image: ACC('masks/17.png'),    aStyle: NEW_MASK, screen: true,  thumbOrigin: '50% 10%', thumbScale: 2 },
  { id: 'm21',   label: 'Mask 21',        image: ACC('masks/21.png'),    aStyle: NEW_MASK, screen: true,  thumbOrigin: '50% 10%', thumbScale: 2 },
];

// Bodies: Scl(scale, cx%, cy%, targetY_px)
// cx,cy = ancre du contenu dans l'image (mesurée). scale = seul chiffre à ajuster.
// targetY=52 → aligne en haut du corps avatar | targetY=8 → aligne en haut de la tête
// cx=26 standardisé pour tous → même position horizontale sur l'avatar
// tous harmonisés sur b12 : cx=26, cy=22.5, tY=11, tX=12.5
export const AVATAR_BODY: Acc[] = [
  { id: 'none', label: 'None',             image: null },
  { id: 'b1',   label: 'Gilet tactique',    image: ACC('body/1.png'),  aStyle: Scl(1.55, 26, 22.5, 11, 12.5), thumbOrigin: '50% 58%', thumbScale: 1.8 },
  { id: 'b4',   label: 'Équipement sci-fi', image: ACC('body/4.png'),  aStyle: Scl(1.55, 26, 22.5, 11, 12.5), thumbOrigin: '50% 58%', thumbScale: 1.8 },
  { id: 'b5',   label: 'Templier',          image: ACC('body/5.png'),  aStyle: Scl(1.55, 26, 22.5, 11, 12.5), thumbOrigin: '50% 58%', thumbScale: 1.8 },
  { id: 'b7',   label: 'Barbare',           image: ACC('body/7.png'),  aStyle: Scl(1.55, 26, 22.5, 11, 12.5), screen: true, thumbOrigin: '50% 58%', thumbScale: 1.8 },
  { id: 'b10',  label: 'Archer',            image: ACC('body/10.png'), aStyle: Scl(1.55, 26, 22.5, 11, 12.5), thumbOrigin: '50% 58%', thumbScale: 1.8 },
  { id: 'b12',  label: 'Harnais spatial',   image: ACC('body/12.png'), aStyle: Scl(1.55, 26, 22.5, 11, 12.5), thumbOrigin: '50% 58%', thumbScale: 1.8 },
  { id: 'b16',  label: 'Buoy',             image: ACC('body/16.png'), aStyle: Scl(1.29, 26, 22.5, 11, 12.5), thumbOrigin: '50% 43%', thumbScale: 1.8 },
  { id: 'b18',  label: 'Pirate',            image: ACC('body/18.png'), aStyle: Scl(1.55, 26, 22.5, 11, 12.5), thumbOrigin: '50% 58%', thumbScale: 1.8 },
  { id: 'b19',  label: 'Sailor stripe',         image: ACC('body/19.png'), aStyle: Scl(1.55, 26, 22.5, 11, 12.5), thumbOrigin: '50% 58%', thumbScale: 1.8 },
];

// backwards compat
export const AVATAR_FACE   = AVATAR_MASKS;
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

const sizeMap = { sm: 'w-6', md: 'w-10', lg: 'w-16', xl: 'w-24' };

export function AvatarDisplay({ color = '#7C3AED', hat, glasses, mask, body, size = 'md', className }: AvatarDisplayProps) {
  const width = sizeMap[size];
  const hue = AVATAR_COLORS.find(c => c.value === color)?.hue ?? 0;

  const hatItem     = AVATAR_HATS.find(h => h.id === hat);
  const glassesItem = AVATAR_GLASSES.find(g => g.id === glasses);
  const maskItem    = AVATAR_MASKS.find(m => m.id === mask);
  const bodyItem    = AVATAR_BODY.find(b => b.id === body);

  return (
    <div className={cn('relative flex-shrink-0 inline-block', width, className)}>
      <img
        src={faviconLogo}
        alt="Avatar"
        className="w-full h-auto block"
        style={hue !== 0 ? { filter: `hue-rotate(${hue}deg)` } : undefined}
      />
      {bodyItem?.image && (
        <img src={bodyItem.image} alt={bodyItem.label} className="absolute pointer-events-none"
          style={{ ...bodyItem.aStyle, mixBlendMode: bodyItem.screen ? 'screen' : 'normal' }} />
      )}
      {hatItem?.image && (
        <img src={hatItem.image} alt={hatItem.label} className="absolute pointer-events-none"
          style={hatItem.aStyle ?? OLD_HAT} />
      )}
      {glassesItem?.image && (
        <img src={glassesItem.image} alt={glassesItem.label} className="absolute pointer-events-none"
          style={{ width: '41%', left: '30%', top: '3%' }} />
      )}
      {maskItem?.image && (
        <img src={maskItem.image} alt={maskItem.label} className="absolute pointer-events-none"
          style={{ ...maskItem.aStyle, mixBlendMode: maskItem.screen ? 'screen' : 'normal' }} />
      )}
    </div>
  );
}

/** Thumbnail 40×40 qui zoome sur la zone de l'accessoire */
export function AccThumb({ acc, selected, onClick }: { acc: Acc; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-10 h-10 rounded-lg border transition-all overflow-hidden flex-shrink-0',
        selected ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:border-muted-foreground'
      )}
    >
      {acc.image ? (
        <div className="w-full h-full overflow-hidden relative" style={acc.screen ? { background: '#222' } : {}}>
          <img
            src={acc.image}
            alt={acc.label}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{
              transform: `scale(${acc.thumbScale ?? 1})`,
              transformOrigin: acc.thumbOrigin ?? 'center center',
              ...(acc.screen ? { mixBlendMode: 'screen' as const } : {}),
            }}
          />
        </div>
      ) : (
        <span className="flex items-center justify-center w-full h-full text-xs text-muted-foreground">—</span>
      )}
    </button>
  );
}
