"use client";

import React from "react";
import { DeviceType, DeviceColor, DEVICE_SPECS, COLOR_CONFIGS } from "./deviceSpecs";

interface RealisticDeviceProps {
  type: DeviceType;
  color: DeviceColor;
  screenshotUrl?: string | null;
  width?: number;
  height?: number;
  rotation?: number;
  is3D?: boolean;
  shadow?: boolean;
  reflection?: boolean;
  ambientLight?: boolean;
  style?: React.CSSProperties;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

export const RealisticDevice: React.FC<RealisticDeviceProps> = ({
  type = 'iphone_dynamic_island',
  color = 'titanium',
  screenshotUrl,
  width,
  height,
  rotation = 0,
  is3D = false,
  shadow = true,
  reflection = true,
  ambientLight = true,
  style = {},
  className = "",
  onClick,
  onMouseDown,
  children
}) => {
  const spec = DEVICE_SPECS[type] || DEVICE_SPECS.iphone_dynamic_island;
  const col = COLOR_CONFIGS[color] || COLOR_CONFIGS.titanium;

  const deviceW = width || spec.baseWidth;
  const deviceH = height || spec.baseHeight;
  const scaleRatio = deviceW / spec.baseWidth;

  const scaledRadius = Math.round(spec.cornerRadius * scaleRatio);
  const scaledScreenRadius = Math.round(spec.screenCornerRadius * scaleRatio);
  const scaledBezel = Math.max(4, Math.round(spec.bezelWidth * scaleRatio));

  // 3D perspective transform
  const transformStyle = is3D 
    ? `perspective(1000px) rotateZ(-12deg) rotateX(12deg) rotateY(-14deg) rotate(${rotation}deg) scale(0.96)`
    : rotation !== 0 
      ? `rotate(${rotation}deg)` 
      : 'none';

  // Dynamic shadow
  const shadowStyle = shadow
    ? is3D
      ? '-35px 45px 60px rgba(0,0,0,0.45), -15px 20px 25px rgba(0,0,0,0.3)'
      : '0 25px 60px -12px rgba(0, 0, 0, 0.45), 0 12px 28px -8px rgba(0, 0, 0, 0.3)'
    : 'none';

  // Real Hardware Photo Mockup Mode (Ultra Realistis dengan tekstur titanium asli & kamera optik)
  const isRealPhotoFrame = type === 'iphone_dynamic_island';
  const realScreenLeftPercent = (37 / 588) * 100;
  const realScreenTopPercent = (35 / 1194) * 100;
  const realScreenWidthPercent = (514 / 588) * 100;
  const realScreenHeightPercent = (1122 / 1194) * 100;

  if (isRealPhotoFrame) {
    return (
      <div
        className={className}
        onClick={onClick}
        onMouseDown={onMouseDown}
        style={{
          position: 'relative',
          width: deviceW,
          height: deviceH,
          transform: transformStyle,
          transformOrigin: 'center center',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s',
          filter: shadow ? (is3D ? 'drop-shadow(-20px 30px 35px rgba(0,0,0,0.45))' : 'drop-shadow(0 20px 35px rgba(0,0,0,0.35))') : 'none',
          ...style
        }}
      >
        {/* INNER SCREEN CONTAINER (Placed exactly beneath the photorealistic chassis) */}
        <div
          style={{
            position: 'absolute',
            left: `${realScreenLeftPercent}%`,
            top: `${realScreenTopPercent}%`,
            width: `${realScreenWidthPercent}%`,
            height: `${realScreenHeightPercent}%`,
            borderRadius: Math.round(44 * scaleRatio),
            overflow: 'hidden',
            background: '#090d16',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {screenshotUrl ? (
            <img
              src={screenshotUrl}
              alt="Device App Screenshot"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          ) : children ? (
            children
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              <div
                style={{
                  height: Math.round(80 * scaleRatio),
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  padding: `${Math.round(36 * scaleRatio)}px ${Math.round(16 * scaleRatio)}px 0`,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box'
                }}
              >
                <div>
                  <div style={{ fontSize: Math.round(13 * scaleRatio), fontWeight: 700 }}>Workspace App</div>
                  <div style={{ fontSize: Math.round(9 * scaleRatio), opacity: 0.8 }}>Active Project</div>
                </div>
                <div
                  style={{
                    width: Math.round(24 * scaleRatio),
                    height: Math.round(24 * scaleRatio),
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.25)'
                  }}
                />
              </div>

              <div style={{ padding: Math.round(14 * scaleRatio), flex: 1, display: 'flex', flexDirection: 'column', gap: Math.round(12 * scaleRatio) }}>
                <div
                  style={{
                    height: Math.round(100 * scaleRatio),
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    borderRadius: Math.round(12 * scaleRatio),
                    border: '1px solid #bfdbfe',
                    padding: Math.round(12 * scaleRatio),
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ width: '60%', height: Math.round(14 * scaleRatio), background: '#3b82f6', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ width: '85%', height: Math.round(9 * scaleRatio), background: '#93c5fd', borderRadius: 4 }} />
                </div>

                <div style={{ display: 'flex', gap: Math.round(10 * scaleRatio) }}>
                  <div style={{ flex: 1, height: Math.round(75 * scaleRatio), background: '#ffffff', borderRadius: Math.round(10 * scaleRatio), border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} />
                  <div style={{ flex: 1, height: Math.round(75 * scaleRatio), background: '#ffffff', borderRadius: Math.round(10 * scaleRatio), border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} />
                </div>

                <div style={{ flex: 1, background: '#ffffff', borderRadius: Math.round(12 * scaleRatio), border: '1px solid #e2e8f0', padding: Math.round(12 * scaleRatio) }}>
                  <div style={{ width: '40%', height: Math.round(12 * scaleRatio), background: '#64748b', borderRadius: 4, marginBottom: 12 }} />
                  <div style={{ width: '100%', height: Math.round(8 * scaleRatio), background: '#f1f5f9', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ width: '90%', height: Math.round(8 * scaleRatio), background: '#f1f5f9', borderRadius: 4 }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PHOTOREALISTIC HARDWARE CHASSIS OVERLAY (Contains Real Metal Texture, Bezels, & Camera Glass) */}
        <img
          src="/mockups/iphone16_frame.png"
          alt="Realistic iPhone 16 Pro Frame"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            zIndex: 10
          }}
        />

        {/* DYNAMIC ISLAND SENSOR OVERLAY */}
        <div
          style={{
            position: 'absolute',
            top: `${realScreenTopPercent + 1.2}%`,
            left: '50%',
            transform: 'translateX(-50%)',
            width: Math.round(88 * scaleRatio),
            height: Math.round(27 * scaleRatio),
            background: '#000000',
            borderRadius: Math.round(16 * scaleRatio),
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `0 ${Math.round(8 * scaleRatio)}px`,
            boxShadow: '0 0 2px rgba(0,0,0,0.9)'
          }}
        >
          <div
            style={{
              width: Math.round(7 * scaleRatio),
              height: Math.round(7 * scaleRatio),
              borderRadius: '50%',
              background: '#0a0d14',
              border: '1px solid #1e293b'
            }}
          />
          <div
            style={{
              width: Math.round(10 * scaleRatio),
              height: Math.round(10 * scaleRatio),
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #1e3a8a 0%, #030712 70%)',
              boxShadow: 'inset 0 0 2px rgba(255,255,255,0.4)'
            }}
          />
        </div>

        {/* NATURAL GLASS REFLECTION OVERLAY */}
        {reflection && (
          <div
            style={{
              position: 'absolute',
              left: `${realScreenLeftPercent}%`,
              top: `${realScreenTopPercent}%`,
              width: `${realScreenWidthPercent}%`,
              height: `${realScreenHeightPercent}%`,
              borderRadius: Math.round(44 * scaleRatio),
              pointerEvents: 'none',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.03) 40%, transparent 60%)',
              zIndex: 15
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      onClick={onClick}
      onMouseDown={onMouseDown}
      style={{
        position: 'relative',
        width: deviceW,
        height: deviceH,
        transform: transformStyle,
        transformOrigin: 'center center',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s',
        ...style
      }}
    >
      {/* SIDE BUTTONS (Left & Right) */}
      {spec.buttons.map((btn, idx) => {
        const btnTop = btn.top * scaleRatio;
        const btnHeight = btn.height * scaleRatio;
        const btnThick = Math.max(2, Math.round(3.5 * scaleRatio));
        const isLeft = btn.side === 'left';

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: btnTop,
              [isLeft ? 'left' : 'right']: -btnThick,
              width: btnThick,
              height: btnHeight,
              background: col.buttonColor,
              borderTopLeftRadius: isLeft ? 3 : 0,
              borderBottomLeftRadius: isLeft ? 3 : 0,
              borderTopRightRadius: isLeft ? 0 : 3,
              borderBottomRightRadius: isLeft ? 0 : 3,
              boxShadow: isLeft 
                ? '-1px 0 2px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.3)' 
                : '1px 0 2px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.3)',
              zIndex: 1
            }}
          />
        );
      })}

      {/* OUTER CHASSIS / FRAME */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: scaledRadius,
          background: col.bodyGradient,
          boxShadow: shadowStyle,
          border: `1.5px solid ${col.borderOuter}`,
          padding: scaledBezel,
          boxSizing: 'border-box',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* METALLIC AMBIENT RIM HIGHLIGHT */}
        {ambientLight && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: scaledRadius,
              border: `1px solid ${col.sideHighlight}`,
              pointerEvents: 'none',
              zIndex: 4
            }}
          />
        )}

        {/* INNER SCREEN CONTAINER */}
        <div
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            borderRadius: scaledScreenRadius,
            background: '#090d16',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `inset 0 0 0 1px ${col.bezelBorder}`,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* HARDWARE CUTOUT: DYNAMIC ISLAND */}
          {spec.hasDynamicIsland && (
            <div
              style={{
                position: 'absolute',
                top: Math.max(8, Math.round(11 * scaleRatio)),
                left: '50%',
                transform: 'translateX(-50%)',
                width: Math.round(92 * scaleRatio),
                height: Math.round(28 * scaleRatio),
                background: '#000000',
                borderRadius: Math.round(16 * scaleRatio),
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `0 ${Math.round(8 * scaleRatio)}px`,
                boxShadow: '0 0 1px 1px rgba(255,255,255,0.06)'
              }}
            >
              {/* Speaker / Sensor */}
              <div
                style={{
                  width: Math.round(8 * scaleRatio),
                  height: Math.round(8 * scaleRatio),
                  borderRadius: '50%',
                  background: '#0a0d14',
                  border: '1px solid #1e293b'
                }}
              />
              {/* Camera Lens with reflection */}
              <div
                style={{
                  width: Math.round(11 * scaleRatio),
                  height: Math.round(11 * scaleRatio),
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #1e3a8a 0%, #030712 70%)',
                  boxShadow: 'inset 0 0 2px rgba(255,255,255,0.4)'
                }}
              />
            </div>
          )}

          {/* HARDWARE CUTOUT: CLASSIC NOTCH */}
          {spec.hasNotch && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: Math.round(124 * scaleRatio),
                height: Math.round(26 * scaleRatio),
                background: '#000000',
                borderBottomLeftRadius: Math.round(16 * scaleRatio),
                borderBottomRightRadius: Math.round(16 * scaleRatio),
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: Math.round(10 * scaleRatio)
              }}
            >
              {/* Speaker grille */}
              <div
                style={{
                  width: Math.round(44 * scaleRatio),
                  height: Math.round(4 * scaleRatio),
                  borderRadius: 2,
                  background: '#1e293b'
                }}
              />
              {/* Camera */}
              <div
                style={{
                  width: Math.round(9 * scaleRatio),
                  height: Math.round(9 * scaleRatio),
                  borderRadius: '50%',
                  background: '#090d16',
                  border: '1px solid #334155'
                }}
              />
            </div>
          )}

          {/* HARDWARE CUTOUT: PUNCH HOLE (Center Android) */}
          {spec.hasPunchHole && (
            <div
              style={{
                position: 'absolute',
                top: Math.max(8, Math.round(12 * scaleRatio)),
                left: '50%',
                transform: 'translateX(-50%)',
                width: Math.round(14 * scaleRatio),
                height: Math.round(14 * scaleRatio),
                borderRadius: '50%',
                background: '#000000',
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 2px rgba(0,0,0,0.8)'
              }}
            >
              <div
                style={{
                  width: Math.round(8 * scaleRatio),
                  height: Math.round(8 * scaleRatio),
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #2563eb 0%, #020617 80%)',
                  boxShadow: 'inset 0 0 1px rgba(255,255,255,0.5)'
                }}
              />
            </div>
          )}

          {/* HARDWARE CUTOUT: WATERDROP NOTCH */}
          {spec.hasWaterdrop && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: Math.round(22 * scaleRatio),
                height: Math.round(18 * scaleRatio),
                background: '#000000',
                borderBottomLeftRadius: '50%',
                borderBottomRightRadius: '50%',
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  width: Math.round(7 * scaleRatio),
                  height: Math.round(7 * scaleRatio),
                  borderRadius: '50%',
                  background: '#0f172a',
                  border: '1px solid #334155'
                }}
              />
            </div>
          )}

          {/* SCREEN CONTENT (SCREENSHOT / PLACEHOLDER) */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {screenshotUrl ? (
              <img
                src={screenshotUrl}
                alt="Device App Screenshot"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            ) : children ? (
              children
            ) : (
              /* Premium Default Clean App Placeholder */
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}
              >
                {/* App Topbar */}
                <div
                  style={{
                    height: Math.round(80 * scaleRatio),
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    padding: `${Math.round(36 * scaleRatio)}px ${Math.round(16 * scaleRatio)}px 0`,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box'
                  }}
                >
                  <div>
                    <div style={{ fontSize: Math.round(13 * scaleRatio), fontWeight: 700 }}>Workspace App</div>
                    <div style={{ fontSize: Math.round(9 * scaleRatio), opacity: 0.8 }}>Active Project</div>
                  </div>
                  <div
                    style={{
                      width: Math.round(24 * scaleRatio),
                      height: Math.round(24 * scaleRatio),
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.25)'
                    }}
                  />
                </div>

                {/* Body skeleton cards */}
                <div style={{ padding: Math.round(14 * scaleRatio), flex: 1, display: 'flex', flexDirection: 'column', gap: Math.round(12 * scaleRatio) }}>
                  <div
                    style={{
                      height: Math.round(100 * scaleRatio),
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      borderRadius: Math.round(12 * scaleRatio),
                      border: '1px solid #bfdbfe',
                      padding: Math.round(12 * scaleRatio),
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ width: '60%', height: Math.round(14 * scaleRatio), background: '#3b82f6', borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ width: '85%', height: Math.round(9 * scaleRatio), background: '#93c5fd', borderRadius: 4 }} />
                  </div>

                  <div style={{ display: 'flex', gap: Math.round(10 * scaleRatio) }}>
                    <div style={{ flex: 1, height: Math.round(75 * scaleRatio), background: '#ffffff', borderRadius: Math.round(10 * scaleRatio), border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} />
                    <div style={{ flex: 1, height: Math.round(75 * scaleRatio), background: '#ffffff', borderRadius: Math.round(10 * scaleRatio), border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} />
                  </div>

                  <div style={{ flex: 1, background: '#ffffff', borderRadius: Math.round(12 * scaleRatio), border: '1px solid #e2e8f0', padding: Math.round(12 * scaleRatio) }}>
                    <div style={{ width: '40%', height: Math.round(12 * scaleRatio), background: '#64748b', borderRadius: 4, marginBottom: 12 }} />
                    <div style={{ width: '100%', height: Math.round(8 * scaleRatio), background: '#f1f5f9', borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ width: '90%', height: Math.round(8 * scaleRatio), background: '#f1f5f9', borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ width: '70%', height: Math.round(8 * scaleRatio), background: '#f1f5f9', borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            )}

            {/* NATURAL GLASS REFLECTION & DEPTH GRADIENT */}
            {reflection && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.03) 40%, transparent 60%)',
                  zIndex: 25
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
