/**
 * ResourceLoader.js - 리소스 로더 모듈
 * 게임 시작 전 모든 이미지와 오디오 파일을 미리 로딩합니다.
 */

const ResourceLoader = {
  // 로딩 상태
  isLoading: false,
  isComplete: false,
  loadedCount: 0,
  totalCount: 0,
  
  // 로딩된 리소스
  images: {},
  audio: {},
  
  /**
   * 모든 리소스 로딩 시작
   */
  async loadAll() {
    this.isLoading = true;
    this.isComplete = false;
    this.loadedCount = 0;
    this.totalCount = 0;
    
    // 로딩할 리소스 목록 생성
    const imagePaths = this.getImagePaths();
    const audioPaths = this.getAudioPaths();
    
    this.totalCount = imagePaths.length + audioPaths.length;
    
    // 이미지 로딩
    for (const path of imagePaths) {
      await this.loadImage(path);
      this.loadedCount++;
      this.updateProgress();
    }
    
    // 오디오 로딩
    for (const path of audioPaths) {
      await this.loadAudio(path);
      this.loadedCount++;
      this.updateProgress();
    }
    
    this.isLoading = false;
    this.isComplete = true;
    this.onComplete();
  },
  
  /**
   * 로딩할 이미지 경로 목록
   */
  getImagePaths() {
    const paths = [];
    
    // 플레이어 스프라이트
    for (let i = 0; i < 4; i++) {
      paths.push(`images/messiah/animations/idle/frame_${String(i).padStart(3, '0')}.png`);
    }
    for (let i = 0; i < 8; i++) {
      paths.push(`images/messiah/animations/running/frame_${String(i).padStart(3, '0')}.png`);
    }
    // 사망 애니메이션
    for (let i = 0; i < 7; i++) {
      paths.push(`images/messiah/animations/falling-back-death/frame_${String(i).padStart(3, '0')}.png`);
    }
    // 부활 애니메이션
    for (let i = 0; i < 5; i++) {
      paths.push(`images/messiah/animations/getting-up/frame_${String(i).padStart(3, '0')}.png`);
    }
    // 클리어 시퀀스용 캐릭터 스프라이트
    for (let i = 0; i < 4; i++) {
      paths.push(`images/messiah/animations/character/frame_${String(i).padStart(3, '0')}.png`);
    }
    
    // 무기 이미지
    paths.push('images/weapons/seraphic-edge.png');
    paths.push('images/weapons/vorpal-sword.png');
    paths.push('images/weapons/durandal.png');
    paths.push('images/weapons/estoc.png');
    paths.push('images/weapons/morning-star.png');
    paths.push('images/weapons/guillotine.png');
    paths.push('images/weapons/longinus.png');
    
    // 보스 이미지 (미카엘만)
    paths.push('images/enemy/michael/michael.png');
    paths.push('images/enemy/michael/michael_move.png');
    paths.push('images/enemy/michael/michael_dash.png');
    paths.push('images/enemy/michael/michael_dead.png');
    
    // 맵 이미지
    paths.push('images/map/heaven.png');
    
    // 일반 적 스프라이트 (000~003)
    const enemySpriteSets = [
      { base: 'images/enemy/malakh/' },
      { base: 'images/enemy/power/' },
      { base: 'images/enemy/dominion/' }
    ];
    enemySpriteSets.forEach(set => {
      for (let i = 0; i < 4; i++) {
        paths.push(`${set.base}frame_${String(i).padStart(3, '0')}.png`);
      }
    });
    
    // 일반 적 단일 이미지 (스프라이트 없는 타입) - 지옥의 적들은 삭제됨
    
    // 이펙트 이미지
    // Quake 스프라이트
    for (let i = 1; i <= 6; i++) {
      paths.push(`images/effect/quake/frame_${String(i).padStart(3, '0')}.png`);
    }
    // Target 이미지
    paths.push('images/effect/target/target.png');
    
    return paths;
  },
  
  /**
   * 로딩할 오디오 경로 목록 (추후 추가)
   */
  getAudioPaths() {
    const paths = [];
    // 배경음악
    paths.push('audio/title.mp3');
    paths.push('audio/game.mp3');
    paths.push('audio/Michael.mp3'); // 미카엘 전용 BGM
    // 효과음
    paths.push('audio/attack.mp3');
    paths.push('audio/wave_clear.mp3');
    paths.push('audio/death.mp3');
    paths.push('audio/michael_dead.mp3');
    return paths;
  },
  
  /**
   * 이미지 로딩
   */
  loadImage(path) {
    return new Promise((resolve, reject) => {
      // 이미 로딩된 경우
      if (this.images[path]) {
        resolve();
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        this.images[path] = img;
        resolve();
      };
      img.onerror = () => {
        console.warn(`[ResourceLoader] 이미지 로딩 실패: ${path}`);
        // 에러가 나도 계속 진행
        resolve();
      };
      img.src = path;
    });
  },
  
  /**
   * 오디오 로딩
   */
  loadAudio(path) {
    return new Promise((resolve, reject) => {
      // 이미 로딩된 경우
      if (this.audio[path]) {
        resolve();
        return;
      }
      
      const audio = new Audio();
      audio.oncanplaythrough = () => {
        this.audio[path] = audio;
        resolve();
      };
      audio.onerror = () => {
        console.warn(`[ResourceLoader] 오디오 로딩 실패: ${path}`);
        // 에러가 나도 계속 진행
        resolve();
      };
      audio.src = path;
      audio.load();
    });
  },
  
  /**
   * 로딩 진행률 업데이트
   */
  updateProgress() {
    const progress = Math.floor((this.loadedCount / this.totalCount) * 100);
    const progressEl = document.getElementById('loadingProgress');
    if (progressEl) {
      progressEl.textContent = `${progress}%`;
    }
    
    const progressBar = document.getElementById('loadingProgressBar');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  },
  
  /**
   * 로딩 완료 콜백
   */
  onComplete() {
    console.log('[ResourceLoader] 모든 리소스 로딩 완료');
    
    // 로딩 완료 직후 타이틀 BGM 재생 (이미 로딩된 경우)
    if (typeof playBgm === 'function') {
      playBgm('audio/title.mp3', 0.6);
    } else if (typeof ResourceLoader !== 'undefined' && ResourceLoader.getAudio) {
      const titleAudio = ResourceLoader.getAudio('audio/title.mp3');
      if (titleAudio) {
        titleAudio.loop = true;
        titleAudio.volume = 0.6;
        titleAudio.play().catch(() => {});
      }
    }
    
    // 로딩 완료 텍스트로 변경 (게이지바는 그대로 유지)
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
      loadingText.textContent = '로딩 완료!';
    }
    
    // 1초 후 로딩 컨테이너 숨기고 게임시작 버튼만 표시
    setTimeout(() => {
      // 로딩 컨테이너 숨기기 (텍스트와 게이지바 모두 포함)
      const loadingContainer = document.getElementById('loadingContainer');
      if (loadingContainer) {
        loadingContainer.style.display = 'none';
      }
      
      // 게임 시작 버튼만 표시
      const startBtn = document.getElementById('startBtn');
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = '게임시작';
        startBtn.style.display = 'block';
        startBtn.style.opacity = '0';
        startBtn.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          startBtn.style.opacity = '1';
        }, 10);
      }
    }, 1000);
  },
  
  /**
   * 이미지 가져오기
   */
  getImage(path) {
    return this.images[path] || null;
  },
  
  /**
   * 오디오 가져오기
   */
  getAudio(path) {
    return this.audio[path] || null;
  }
};

