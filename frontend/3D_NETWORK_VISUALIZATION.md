# 3D Network Graph Visualization - Visual Design

> **Flare Summer Signal · Track 1** — Pay FXRP/C2FLR on Coston2 → native gas on destination chains (FTSO + FDC + treasuries).


## Overview
A stunning 3D visualization that shows gas flow between chains in an immersive, interactive 3D space.

## Visual Appearance

### Layout
```
        [Chain 3] ←───┐
                      │
    [Chain 2] ←──────┼──→ [Source Chain] ←──────┼──→ [Chain 1]
                      │                          │
        [Chain 4] ←───┘                          │
                                                  │
                                            [Chain 5]
```

### Key Visual Elements

#### 1. **Source Chain (Center)**
- **Position**: Center of the 3D space (0, 0, 0)
- **Appearance**: 
  - Large glowing sphere (24px radius)
  - Pulsing blue glow effect
  - Chain logo in the center
  - White border with shadow
  - Label below showing chain name
- **Animation**: Gentle pulsing glow, subtle rotation

#### 2. **Destination Chains (Orbiting)**
- **Position**: Arranged in a 3D sphere around the source
- **Appearance**:
  - Medium spheres (16px radius)
  - Color-coded borders based on status:
    - 🔵 Blue: Pending/In Progress
    - 🟢 Green: Confirmed
    - 🔴 Red: Failed
  - Chain logos
  - Status badges (checkmark for confirmed)
  - Labels showing chain name and USD amount
- **Animation**: Hover scale effect, glow pulses for confirmed

#### 3. **Connection Beams**
- **Appearance**:
  - Glowing 3D tubes connecting source to destinations
  - Gradient from source (bright) to destination (faded)
  - Color matches chain status
  - Subtle glow/shadow effect
- **Animation**: 
  - Particles flow along the beam
  - White glowing dots moving from source to destination
  - Speed varies (1.5-2.5 seconds per journey)
  - Multiple particles for active dispersals

#### 4. **3D Space Effects**
- **Background**: 
  - Dark gradient (black to gray-900)
  - Grid pattern in the background for depth
  - Subtle fog effect for depth perception
- **Lighting**:
  - Ambient lighting from multiple angles
  - Glow effects on all nodes
  - Shadows cast by nodes

### Interactive Features

#### 1. **Rotation Controls**
- **Mouse Drag**: Click and drag to rotate the entire 3D scene
- **Smooth Rotation**: Rotates around X and Y axes
- **Visual Feedback**: Cursor changes to "grabbing" when dragging

#### 2. **Zoom Controls**
- **Mouse Wheel**: Scroll to zoom in/out
- **Range**: 0.5x to 2x zoom
- **Smooth Transitions**: Eased zoom animations

#### 3. **Hover Effects**
- **Chain Nodes**: Scale up on hover (110%)
- **Tooltips**: Show detailed information
- **Highlight**: Connection beam brightens

### Status Indicators

#### Color Coding
- **Blue (rgba(41, 151, 255))**: 
  - Pending transactions
  - In-progress dispersals
  - Active particle flow
  
- **Green (rgba(34, 197, 94))**:
  - Confirmed transactions
  - Completed dispersals
  - Pulsing glow effect
  
- **Red (rgba(239, 68, 68))**:
  - Failed transactions
  - Error states
  - Static (no animation)

### Animation Details

#### Particle Flow
- Particles are small white glowing dots
- Travel along connection beams
- Speed: 1.5-2.5 seconds per journey
- Multiple particles for active flows
- Fade out at destination

#### Glow Effects
- Source chain: Constant pulsing glow
- Destination chains: Status-based glow
- Confirmed: Pulsing green glow
- Pending: Steady blue glow
- Failed: Static red glow

#### Transitions
- Smooth 0.3s transitions for all state changes
- Eased animations (ease-out)
- No jarring movements

### Technical Implementation

#### CSS 3D Transforms
- Uses `transform-style: preserve-3d`
- `perspective` for 3D depth
- `translateZ` for positioning in 3D space
- `rotateX` and `rotateY` for rotation

#### Performance
- Hardware-accelerated transforms
- Efficient re-renders
- Optimized particle animations
- GPU-accelerated effects

### User Experience

#### Visual Hierarchy
1. Source chain (largest, center)
2. Active connections (glowing beams)
3. Destination chains (medium, orbiting)
4. Background elements (subtle, non-intrusive)

#### Information Display
- Chain names always visible
- USD amounts shown on hover or always
- Status clearly indicated by color
- Real-time updates visible

#### Accessibility
- Keyboard controls (optional)
- Screen reader friendly labels
- High contrast mode support
- Reduced motion option

## Comparison: 2D vs 3D

### Current 2D Visualization
- Flat, left-to-right flow
- Simple SVG paths
- Limited depth perception
- Static viewing angle

### New 3D Visualization
- Immersive 3D space
- Dynamic viewing angles
- Better spatial understanding
- More engaging experience
- Professional, modern appearance

## Use Cases

1. **Live Dispersal Monitoring**: Watch gas flow in real-time
2. **Presentation Mode**: Impressive visual for demos
3. **Status Overview**: Quick visual status check
4. **Educational**: Understand multi-chain architecture
5. **Marketing**: Eye-catching feature showcase

