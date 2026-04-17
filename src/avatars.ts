import avatar1 from '../assets/avatars/avatar1.png';
import avatar2 from '../assets/avatars/avatar2.png';
import avatar3 from '../assets/avatars/avatar3.png';
import avatar4 from '../assets/avatars/avatar4.png';
import avatar5 from '../assets/avatars/avatar5.png';
import avatar6 from '../assets/avatars/avatar6.png';
import avatar7 from '../assets/avatars/avatar7.png';
import avatar8 from '../assets/avatars/avatar8.png';


export interface Avatar {
  id: string;
  name: string;
  image: string;
  alt: string;
  color: 'primary' | 'tertiary' | 'secondary';
}

export const AVATARS: Avatar[] = [
  {
    id: 'syntax',
    name: 'SYNTAX',
    image: avatar1,
    alt: 'vibrant 2d cartoon fox avatar with orange fur and a mischievous grin on a cosmic dark blue background',
    color: 'primary'
  },    
  {
    id: 'buffer',
    name: 'BUFFER',
    image: avatar2,
    alt: 'sleek futuristic 2d robot avatar with cyan neon lights and a digital display face on a dark background',
    color: 'tertiary'
  },
  {
    id: 'binary',
    name: 'BINARY',
    image: avatar3,
    alt: 'mystical 2d wizard avatar with a purple hat and glowing magic staff on a cosmic dark background',
    color: 'secondary'
  },
  {
    id: 'uplink',
    name: 'UPLINK',
    image: avatar4,
    alt: 'cute spooky 2d ghost avatar with glowing eyes and a soft spectral blue outline on a dark background',
    color: 'primary'
  },
    {
    id: 'vector',
    name: 'VECTOR',
    image: avatar5,
    alt: 'vibrant 2d cartoon fox avatar with orange fur and a mischievous grin on a cosmic dark blue background',
    color: 'primary'
  },    
  {
    id: 'patch',
    name: 'PATCH',
    image: avatar6,
    alt: 'sleek futuristic 2d robot avatar with cyan neon lights and a digital display face on a dark background',
    color: 'tertiary'
  },
  {
    id: 'kernel',
    name: 'KERNEL',
    image: avatar7,
    alt: 'mystical 2d wizard avatar with a purple hat and glowing magic staff on a cosmic dark background',
    color: 'secondary'
  },
  {
    id: 'cobalt',
    name: 'COBALT',
    image: avatar8,
    alt: 'cute spooky 2d ghost avatar with glowing eyes and a soft spectral blue outline on a dark background',
    color: 'primary'
  }
];

export const getAvatarById = (id: string): Avatar | undefined => {
  return AVATARS.find(avatar => avatar.id === id);
};
