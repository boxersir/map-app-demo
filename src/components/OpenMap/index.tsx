import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from 'mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';

// 替换为你的 Mapbox Access Token

const MapComponent = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef();
  function rotate() {
    let center = mapRef.current.getCenter();
    mapRef.current.easeTo({
      center: [center.lng + 40, center.lat],
      zoom: 2,
      speed: 0.5
    })
    requestAnimationFrame(rotate);
  }
  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoieWFuZ2ppYW4iLCJhIjoiY2phaG1neno0MXFkNDMzbWhwNWw0bWM4aiJ9.CFmrh0LVWAbmVeed-Xr7wA';
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.5, 40], // 初始中心点坐标
        zoom: 9, // 初始缩放级别
      projection: 'globe', // 坐标系
      config: {
        basemap: {
          lightPreset:'night'
        }
      }
    });

    // 添加控制条
    // mapRef.current.addControl(new mapboxgl.NavigationControl());
    mapRef.current.flyTo({
        center: [112.92850, 28.18],
        zoom: 14,
        speed: 0.4,
        pitch: 60,
    })
    mapRef.current.on('load', () => {
      mapRef.current.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
        });
        mapRef.current.addControl(new mapboxgl.FullscreenControl());
        mapRef.current.addControl(new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        }));
        mapRef.current.addControl(new mapboxgl.ScaleControl({
            maxWidth: 200,
            unit: 'metric'
        }), 'bottom-left');
        mapRef.current.addControl(new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl
        }), 'top-left');
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

        mapRef.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
    });
    setTimeout(() => {
        // rotate();
    },20000)
    // 清理地图实例
    return () => mapRef.current.remove();
  }, []);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />;
};

export default MapComponent;