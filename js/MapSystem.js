/**
 * MapSystem.js - 맵 시스템 모듈
 * 스테이지별 맵 데이터를 관리합니다.
 */

const MapSystem = {
  // 맵 크기 (정사각형) - 카메라 여유 공간을 위해 크게 설정
  mapSize: 2800,
  // 플레이어 이동 가능한 실제 범위 (현재와 동일하게 유지)
  playableAreaSize: 2000,
  // 원형 경계 반지름
  get mapRadius() {
    return this.playableAreaSize / 2;
  },
  // 맵 중심 X 좌표
  get mapCenterX() {
    return this.mapSize / 2;
  },
  // 맵 중심 Y 좌표 (아래로 조금 내림)
  get mapCenterY() {
    return this.mapSize / 2 + 300; // 100픽셀 아래로
  },
  // 맵 이미지
  heavenMapImage: null,
  
  // 스테이지별 맵 데이터
  stages: {
    2: {
      id: 'stage2',
      name: '낙원',
      desc: '승리의 정원',
      backgroundColor: '#e6f3ff',
      backgroundType: 'heaven', // 천국
      spawnArea: {
        top: { x: -200, y: -100, width: 2400, height: 100 },
        bottom: { x: -200, y: 2000, width: 2400, height: 100 },
        left: { x: -100, y: -200, width: 100, height: 2400 },
        right: { x: 2000, y: -200, width: 100, height: 2400 }
      }
    },
    99: {
      id: 'stage99',
      name: '테스트 스테이지',
      backgroundColor: '#1a1a2e',
      backgroundType: 'heaven',
      spawnArea: {
        top: { x: -200, y: -100, width: 2400, height: 100 },
        bottom: { x: -200, y: 2000, width: 2400, height: 100 },
        left: { x: -100, y: -200, width: 100, height: 2400 },
        right: { x: 2000, y: -200, width: 100, height: 2400 }
      }
    }
  },
  
  // 현재 스테이지
  currentStage: null,
  
  /**
   * 스테이지 로드
   */
  loadStage(stageNumber) {
    if (!this.stages[stageNumber]) {
      console.error(`스테이지 ${stageNumber}를 찾을 수 없습니다.`);
      return null;
    }
    
    this.currentStage = { ...this.stages[stageNumber] };
    return this.currentStage;
  },
  
  /**
   * 현재 스테이지 정보 반환
   */
  getCurrentStage() {
    return this.currentStage;
  },
  
  /**
   * 현재 스테이지의 배경 타입 반환 (heaven 또는 hell)
   */
  getCurrentBackgroundType() {
    if (!this.currentStage) return 'hell'; // 기본값
    return this.currentStage.backgroundType || 'hell';
  },
  
  /**
   * 맵 경계 체크 (원형 경계)
   */
  checkBounds(x, y, width, height) {
    if (!this.currentStage) return { x, y };
    
    const centerX = this.mapCenterX;
    const centerY = this.mapCenterY;
    const radius = this.mapRadius;
    
    // 객체의 중심점에서 맵 중심까지의 거리 계산
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 객체의 반지름 (대각선 길이의 절반)
    const objectRadius = Math.sqrt(width * width + height * height) / 2;
    
    // 원 경계를 넘어가면 원 경계 내로 제한
    if (distance + objectRadius > radius) {
      const maxDistance = radius - objectRadius;
      const angle = Math.atan2(dy, dx);
      return {
        x: centerX + Math.cos(angle) * maxDistance,
        y: centerY + Math.sin(angle) * maxDistance
      };
    }
    
    return { x, y };
  },
  
  /**
   * 맵 렌더링
   */
  render(ctx, cameraX, cameraY, dt = 0) {
    if (!this.currentStage) return;
    
    // 스테이지별 커스텀 배경 렌더링 (원형 클리핑 없이 전체 표시)
    if (this.currentStage.id === 'stage1') {
      this.renderHellBackground(ctx);
    } else if (this.currentStage.id === 'stage2') {
      this.renderHeavenBackground(ctx);
    } else {
      // 기본 배경 색상
      ctx.fillStyle = this.currentStage.backgroundColor;
      ctx.fillRect(0, 0, this.mapSize, this.mapSize);
    }
    
    // 플레이어 이동 가능한 원형 경계 테두리 (스테이지별 스타일)
    this.renderMapBorder(ctx, dt);
  },
  
  /**
   * 지옥 배경 렌더링 (스테이지 1)
   */
  renderHellBackground(ctx) {
    const mapSize = this.mapSize;
    
    // 기본 어두운 배경
    const gradient = ctx.createLinearGradient(0, 0, 0, mapSize);
    gradient.addColorStop(0, '#0a0000'); // 상단: 거의 검은색
    gradient.addColorStop(0.5, '#1a0000'); // 중간: 어두운 빨강
    gradient.addColorStop(1, '#0a0000'); // 하단: 거의 검은색
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, mapSize, mapSize);
    
    // 그리드 그리기
    ctx.strokeStyle = '#330000'; // 어두운 빨간색
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    
    const gridSize = 50; // 그리드 셀 크기
    
    // 세로선
    for (let x = 0; x <= mapSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mapSize);
      ctx.stroke();
    }
    
    // 가로선
    for (let y = 0; y <= mapSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mapSize, y);
      ctx.stroke();
    }
    
    // 붉은 안개 효과 (플레이 가능 영역 중심)
    ctx.globalAlpha = 0.15;
    const centerX = this.playableAreaSize / 2;
    const centerY = this.playableAreaSize / 2;
    const fogGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, this.playableAreaSize);
    fogGradient.addColorStop(0, 'transparent');
    fogGradient.addColorStop(0.5, '#ff0000');
    fogGradient.addColorStop(1, '#330000');
    ctx.fillStyle = fogGradient;
    ctx.fillRect(0, 0, mapSize, mapSize);
    
    ctx.globalAlpha = 1.0; // 알파 복원
  },
  
  /**
   * 천국 배경 렌더링 (스테이지 2)
   */
  renderHeavenBackground(ctx) {
    const mapSize = this.mapSize;
    
    // 이미지가 로드되어 있으면 이미지 사용
    if (this.heavenMapImage) {
      // 이미지를 실제 맵 크기에 맞춰 그리기 (맵 전체를 덮음)
      ctx.drawImage(this.heavenMapImage, 0, 0, mapSize, mapSize);
    } else {
      // 이미지가 없으면 기본 그라데이션 배경 사용
      const gradient = ctx.createLinearGradient(0, 0, 0, mapSize);
      gradient.addColorStop(0, '#b3d9ff'); // 상단: 어두운 하늘색
      gradient.addColorStop(0.5, '#ccd9b3'); // 중간: 어두운 크림색
      gradient.addColorStop(1, '#ccb3d9'); // 하단: 어두운 핑크색
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, mapSize, mapSize);
      
      // 그리드 그리기 (천국 테마에 맞게)
      ctx.strokeStyle = '#9999cc'; // 어두운 보라색
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.15;
      
      const gridSize = 50;
      
      // 세로선
      for (let x = 0; x <= mapSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapSize);
        ctx.stroke();
      }
      
      // 가로선
      for (let y = 0; y <= mapSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(mapSize, y);
        ctx.stroke();
      }
      
      // 황금빛 안개 효과 (밝기 낮춤, 플레이 가능 영역 중심)
      ctx.globalAlpha = 0.08;
      const centerX = this.playableAreaSize / 2;
      const centerY = this.playableAreaSize / 2;
      const goldFogGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, this.playableAreaSize);
      goldFogGradient.addColorStop(0, 'transparent');
      goldFogGradient.addColorStop(0.5, '#ccaa00');
      goldFogGradient.addColorStop(1, '#ccbb33');
      ctx.fillStyle = goldFogGradient;
      ctx.fillRect(0, 0, mapSize, mapSize);
      
      ctx.globalAlpha = 1.0; // 알파 복원
    }
  },
  
  /**
   * 맵 경계 테두리 렌더링 (플레이어가 다가가면 일정 범위만 표시)
   */
  renderMapBorder(ctx) {
    if (!this.currentStage || !Player) return;
    
    const centerX = this.mapCenterX;
    const centerY = this.mapCenterY;
    const radius = this.mapRadius;
    
    // 플레이어 위치에서 원 중심까지의 거리 계산
    const dx = Player.x - centerX;
    const dy = Player.y - centerY;
    const playerDistance = Math.sqrt(dx * dx + dy * dy);
    
    // 플레이어가 원 경계로부터의 거리 계산
    const distanceToBorder = Math.abs(playerDistance - radius);
    
    // 플레이어가 테두리로부터 일정 거리(200px) 이상이면 표시 안 함
    const maxShowDistance = 200;
    const minShowDistance = 100;
    if (distanceToBorder > maxShowDistance) {
      return; // 테두리 표시 안 함
    }
    
    ctx.save();
    
    // 거리에 따른 투명도 계산 (200px에서 100px까지 서서히 나타남)
    let alpha = 1.0;
    if (distanceToBorder > minShowDistance) {
      // 200px ~ 100px 사이에서 서서히 나타남
      const fadeRange = maxShowDistance - minShowDistance; // 100px
      const fadeProgress = (distanceToBorder - minShowDistance) / fadeRange; // 0 ~ 1
      alpha = 1.0 - fadeProgress; // 1.0 ~ 0.0
    }
    
    // 플레이어 위치에서 원 중심으로의 각도
    const playerAngle = Math.atan2(dy, dx);
    
    // 테두리에서 플레이어가 바라보는 위치의 각도 (플레이어 위치에서 테두리로의 각도)
    // 플레이어가 원 안에 있으면 바깥쪽 테두리를, 원 밖에 있으면 안쪽 테두리를 표시
    const borderAngle = playerAngle; // 플레이어가 바라보는 방향의 테두리
    
    // 테두리의 일정 범위만 표시 (호 형태)
    const showAngleRange = Math.PI / 18; // 10도 범위
    const startAngle = borderAngle - showAngleRange;
    const endAngle = borderAngle + showAngleRange;
    
    // 빨간색 점선 테두리 (일정 범위만, 투명도 적용)
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]); // 선 10px, 간격 5px
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.stroke();
    ctx.globalAlpha = 1.0; // 알파 복원
    
    // 점선 패턴 초기화
    ctx.setLineDash([]);
    
    ctx.restore();
  },
  
  /**
   * 맵 이미지 로드
   */
  loadMapImages() {
    // ResourceLoader에서 이미지 가져오기
    if (ResourceLoader.images['images/map/heaven.png']) {
      this.heavenMapImage = ResourceLoader.images['images/map/heaven.png'];
    }
  }
};
