/**
 * CollisionSystem.js - 충돌 판정 시스템 모듈
 * 공간 분할 및 최적화된 충돌 검사
 */

const CollisionSystem = {
  // 그리드 기반 공간 분할
  gridSize: 200, // 그리드 셀 크기
  gridCols: 0,
  gridRows: 0,
  grid: [], // 2D 배열: grid[y][x] = [enemies, projectiles]
  
  // 충돌 판정 박스 크기 (이미지 대비 비율)
  hitboxSizes: {
    player: 0.3,      // 플레이어 피격 판정 (더 작게)
    enemy: 0.85,      // 적 피격 판정 (80~90%)
    boss: 0.3,        // 보스 피격 판정 (50% - 미카엘 히트박스 더 축소)
    playerAttack: 1.3, // 플레이어 공격 판정 (120~150%)
    item: 2.0,        // 아이템 습득 판정 (매우 크게)
    projectile: 0.8   // 투사체 판정
  },
  
  /**
   * 초기화
   */
  init() {
    // 맵 크기에 맞춰 그리드 생성
    this.gridCols = Math.ceil(MapSystem.mapSize / this.gridSize);
    this.gridRows = Math.ceil(MapSystem.mapSize / this.gridSize);
    this.grid = [];
    
    for (let y = 0; y < this.gridRows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridCols; x++) {
        this.grid[y][x] = { enemies: [], projectiles: [] };
      }
    }
  },
  
  /**
   * 월드 좌표를 그리드 좌표로 변환
   */
  worldToGrid(worldX, worldY) {
    const gridX = Math.floor(worldX / this.gridSize);
    const gridY = Math.floor(worldY / this.gridSize);
    return {
      x: Math.max(0, Math.min(this.gridCols - 1, gridX)),
      y: Math.max(0, Math.min(this.gridRows - 1, gridY))
    };
  },
  
  /**
   * 오브젝트를 그리드에 등록
   */
  registerObject(obj, type) {
    // 그리드가 초기화되지 않았으면 무시
    if (!this.grid || this.grid.length === 0) return;
    
    const gridPos = this.worldToGrid(obj.x, obj.y);
    
    // 그리드 범위 체크
    if (gridPos.y < 0 || gridPos.y >= this.gridRows || 
        gridPos.x < 0 || gridPos.x >= this.gridCols) {
      return;
    }
    
    const cell = this.grid[gridPos.y][gridPos.x];
    if (!cell) return;
    
    if (type === 'enemy' || type === 'boss') {
      if (!cell.enemies.includes(obj)) {
        cell.enemies.push(obj);
      }
    } else if (type === 'projectile') {
      if (!cell.projectiles.includes(obj)) {
        cell.projectiles.push(obj);
      }
    }
  },
  
  /**
   * 그리드 초기화 (매 프레임)
   */
  clearGrid() {
    for (let y = 0; y < this.gridRows; y++) {
      for (let x = 0; x < this.gridCols; x++) {
        this.grid[y][x].enemies = [];
        this.grid[y][x].projectiles = [];
      }
    }
  },
  
  /**
   * 거리 기반 충돌 검사 (빠른 필터링)
   */
  checkDistance(x1, y1, x2, y2, maxDistance) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return (dx * dx + dy * dy) <= (maxDistance * maxDistance);
  },
  
  /**
   * AABB 충돌 검사
   */
  checkAABB(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  },
  
  /**
   * 플레이어와 적 충돌 검사 (공간 분할 최적화)
   */
  checkPlayerEnemyCollision(player, enemies) {
    if (!player || !enemies || enemies.length === 0) return null;
    
    const playerGrid = this.worldToGrid(player.x, player.y);
    const playerHitbox = this.getHitbox(player, 'player');
    
    // 주변 그리드 셀만 검사 (3x3)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const gx = playerGrid.x + dx;
        const gy = playerGrid.y + dy;
        
        if (gx < 0 || gx >= this.gridCols || gy < 0 || gy >= this.gridRows) continue;
        
        const cell = this.grid[gy][gx];
        
        for (const enemy of cell.enemies) {
          if (!enemy.active || enemy.isDead) continue;
          
          // 거리 기반 빠른 필터링
          const maxDist = (playerHitbox.w + this.getHitbox(enemy, 'enemy').w) / 2 + 50;
          if (!this.checkDistance(player.x, player.y, enemy.x, enemy.y, maxDist)) continue;
          
          // AABB 충돌 검사
          const enemyHitbox = this.getHitbox(enemy, 'enemy');
          if (this.checkAABB(
            playerHitbox.x, playerHitbox.y, playerHitbox.w, playerHitbox.h,
            enemyHitbox.x, enemyHitbox.y, enemyHitbox.w, enemyHitbox.h
          )) {
            return enemy;
          }
        }
      }
    }
    
    return null;
  },
  
  /**
   * 플레이어와 보스 충돌 검사 (일반 적 충돌 검사와 동일한 히트박스 방식)
   */
  checkPlayerBossCollision(player, bosses) {
    if (!player || !bosses || bosses.length === 0) return null;
    
    const playerHitbox = this.getHitbox(player, 'player');
    
    // bosses 배열을 직접 순회 (그리드 대신)
    for (const boss of bosses) {
      if (!boss || boss.hp <= 0) continue;
      
      // 거리 기반 빠른 필터링
      const bossHitbox = this.getHitbox(boss, 'boss');
      const maxDist = (playerHitbox.w + bossHitbox.w) / 2 + 50;
      if (!this.checkDistance(player.x, player.y, boss.x, boss.y, maxDist)) continue;
      
      // AABB 충돌 검사
      if (this.checkAABB(
        playerHitbox.x, playerHitbox.y, playerHitbox.w, playerHitbox.h,
        bossHitbox.x, bossHitbox.y, bossHitbox.w, bossHitbox.h
      )) {
        return boss;
      }
    }
    
    return null;
  },
  
  /**
   * 투사체와 오브젝트 충돌 검사
   */
  checkProjectileCollision(projectiles, targets, targetType) {
    const hits = [];
    
    if (!projectiles || !targets) return hits;
    
    for (const proj of projectiles) {
      if (!proj.active) continue;
      
      const projGrid = this.worldToGrid(proj.x, proj.y);
      const projHitbox = this.getHitbox(proj, 'projectile');
      
      // 주변 그리드 셀만 검사
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const gx = projGrid.x + dx;
          const gy = projGrid.y + dy;
          
          if (gx < 0 || gx >= this.gridCols || gy < 0 || gy >= this.gridRows) continue;
          
          const cell = this.grid[gy][gx];
          const targetList = targetType === 'enemy' ? cell.enemies : [];
          
          for (const target of targetList) {
            if (!target.active || target.isDead) continue;
            
            // 거리 기반 필터링
            const targetHitbox = this.getHitbox(target, targetType);
            const maxDist = (projHitbox.w + targetHitbox.w) / 2 + 30;
            if (!this.checkDistance(proj.x, proj.y, target.x, target.y, maxDist)) continue;
            
            // AABB 충돌 검사
            if (this.checkAABB(
              projHitbox.x, projHitbox.y, projHitbox.w, projHitbox.h,
              targetHitbox.x, targetHitbox.y, targetHitbox.w, targetHitbox.h
            )) {
              hits.push({ projectile: proj, target: target });
            }
          }
        }
      }
    }
    
    return hits;
  },
  
  /**
   * 히트박스 계산 (이미지 크기 대비 비율 적용)
   */
  getHitbox(obj, type) {
    const size = this.hitboxSizes[type] || 1.0;
    const baseWidth = obj.width || 32;
    const baseHeight = obj.height || 32;
    
    const w = baseWidth * size;
    const h = baseHeight * size;
    
    // 보스의 경우 위아래 흔들림 효과(bobOffset)를 고려
    let yOffset = 0;
    if (type === 'boss' && obj.bobOffset !== undefined) {
      yOffset = obj.bobOffset;
    }
    
    return {
      x: obj.x - w / 2,
      y: obj.y - h / 2 + yOffset,
      w: w,
      h: h
    };
  },
  
  /**
   * 업데이트 (그리드 재구성)
   */
  update() {
    this.clearGrid();
  }
};

