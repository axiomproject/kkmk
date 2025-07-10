declare module 'react-reveal/Fade' {
  import { ComponentType, ReactNode } from 'react';

  interface FadeProps {
    children: ReactNode;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
    top?: boolean;
    delay?: number;
    duration?: number;
    distance?: string;
    fraction?: number;
    cascade?: boolean;
    collapse?: boolean;
    when?: boolean;
    spy?: any;
    appear?: boolean;
    enter?: boolean;
    exit?: boolean;
    force?: boolean;
    opposite?: boolean;
    mirror?: boolean;
    mountOnEnter?: boolean;
    unmountOnExit?: boolean;
    in?: boolean;
    timeout?: number;
  }

  const Fade: ComponentType<FadeProps>;
  export default Fade;
} 