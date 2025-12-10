/**
 * Projectile.js - 투사체 시스템 모듈
 * 오브젝트 풀링을 사용한 최적화된 투사체 관리
 */

const Projectile = {
  // 오브젝트 풀
  pool: [],
  poolSize: 500, // 풀 크기
  activeProjectiles: [],
  
  /**
   * 초기화
   */
  init() {
    // 오브젝트 풀 생성
    this.pool = [];
    this.activeProjectiles = [];
    
    for (let i = 0; i < this.poolSize; i++) {
      this.pool.push(this.createProjectile());
    }
  },
  
  /**
   * 투사체 객체 생성
   */
  createProjectile() {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      speed: 400,
      damage: 10,
      width: 8,
      height: 8,
      originalWidth: 8,
      originalHeight: 8,
      lifetime: 0,
      maxLifetime: 3, // 초
      active: false,
      owner: null, // 'player' or 'enemy'
      color: '#ff4444'
    };
  },
  
  /**
   * 투사체 발사 (풀에서 가져오기)
   */
  spawn(x, y, angle, speed, damage, owner) {
    // 풀에서 비활성 투사체 찾기
    let proj = this.pool.find(p => !p.active);
    
    // 풀이 부족하면 새로 생성
    if (!proj) {
      proj = this.createProjectile();
      this.pool.push(proj);
    }
    
    // 투사체 초기화
    proj.x = x;
    proj.y = y;
    proj.vx = Math.cos(angle) * speed;
    proj.vy = Math.sin(angle) * speed;
    proj.speed = speed;
    proj.damage = damage;
    proj.lifetime = 0;
    proj.active = true;
    proj.owner = owner;
    proj.color = owner === 'player' ? '#4a90e2' : '#ff0000';
    // 적 투사체 크기 증가 (더 잘 보이게)
    if (owner === 'enemy') {
      proj.width = 12;
      proj.height = 12;
    } else {
      proj.width = proj.originalWidth || 8;
      proj.height = proj.originalHeight || 8;
    }
    
    // originalWidth/Height가 없으면 초기화
    if (!proj.originalWidth) {
      proj.originalWidth = proj.width;
      proj.originalHeight = proj.height;
    }
    
    if (!this.activeProjectiles.includes(proj)) {
      this.activeProjectiles.push(proj);
    }
    
    return proj;
  },
  
  /**
   * 투사체 제거 (풀에 반환)
   */
  despawn(proj) {
    proj.active = false;
    const index = this.activeProjectiles.indexOf(proj);
    if (index > -1) {
      this.activeProjectiles.splice(index, 1);
    }
  },
  
  /**
   * 업데이트
   */
  update(dt) {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const proj = this.activeProjectiles[i];
      
      if (!proj.active) continue;
      
      // 이동
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      
      // 생명주기 감소
      proj.lifetime += dt;
      if (proj.lifetime >= proj.maxLifetime) {
        this.despawn(proj);
        continue;
      }
      
      // 맵 경계 체크
      if (proj.x < 0 || proj.x > MapSystem.mapSize || 
          proj.y < 0 || proj.y > MapSystem.mapSize) {
        this.despawn(proj);
        continue;
      }
      
      // 그리드에 등록
      CollisionSystem.registerObject(proj, 'projectile');
    }
  },
  
  /**
   * 렌더링 (배치 렌더링으로 최적화)
   */
  render(ctx) {
    if (this.activeProjectiles.length === 0) return;
    
    // 같은 색상끼리 묶어서 렌더링
    const byColor = {};
    
    for (const proj of this.activeProjectiles) {
      if (!proj.active) continue;
      
      const color = proj.color;
      if (!byColor[color]) {
        byColor[color] = [];
      }
      byColor[color].push(proj);
    }
    
    // 색상별로 일괄 렌더링
    for (const color in byColor) {
      const projectiles = byColor[color];
      if (projectiles.length === 0) continue;
      
      ctx.fillStyle = color;
      ctx.beginPath();
      
      for (const proj of projectiles) {
        const halfW = proj.width * 0.5;
        const halfH = proj.height * 0.5;
        ctx.rect(proj.x - halfW, proj.y - halfH, proj.width, proj.height);
      }
      
      ctx.fill();
    }
  }
};



