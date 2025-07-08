import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

declare module 'react-leaflet' {
  interface MapContainerProps {
    center?: L.LatLngExpression;
    zoom?: number;
    children?: React.ReactNode;
    className?: string;
    scrollWheelZoom?: boolean;
    style?: React.CSSProperties;
    attributionControl?: boolean;
  }

  interface TileLayerProps {
    url: string;
    attribution?: string;
  }

  interface MarkerProps {
    position: L.LatLngExpression;
    icon?: L.Icon;
    children?: React.ReactNode;
  }
}

declare module 'leaflet' {
  export interface Event {
    type: string;
    target: any;
  }

  export interface PopupEvent extends Event {
    popup: L.Popup;
  }

  export interface Layer {
    _map?: L.Map;
  }
  export type LatLngTuple = [number, number];
  export type LatLngExpression = LatLngTuple | { lat: number; lng: number };
}
