/**
 * SpeechBubble.js - 말풍선 시스템 모듈
 * 캐릭터 위에 말풍선을 표시하고 타이핑 효과를 제공합니다.
 */

const SpeechBubble = {
  // 현재 말풍선 데이터
  currentBubble: null,
  currentTextIndex: 0, // 현재 표시 중인 텍스트 인덱스
  displayedText: '', // 현재 표시된 텍스트 (타이핑 효과)
  typingTimer: 0,
  typingSpeed: 0.05, // 타이핑 속도
  autoAdvanceTimer: 0,
  autoAdvanceDelay: 3.0, // 자동 넘어가기 시간
  isTyping: false, // 타이핑 중인지
  
  // 말풍선 스타일
  bubblePadding: 12,
  bubbleOffsetY: -50, // 캐릭터 머리 위 오프셋
  maxWidth: 200, // 최대 너비
  
  /**
   * 초기화
   */
  init() {
    this.currentBubble = null;
    this.currentTextIndex = 0;
    this.displayedText = '';
    this.typingTimer = 0;
    this.autoAdvanceTimer = 0;
    this.isTyping = false;
  },
  
  /**
   * 말풍선 표시
   * @param {Object} target - 말풍선을 표시할 대상 (x, y 속성 필요)
   * @param {string|Array} texts - 표시할 텍스트 (문자열 또는 배열)
   */
  show(target, texts) {
    // 텍스트를 배열로 변환
    const textArray = Array.isArray(texts) ? texts : [texts];
    
    this.currentBubble = {
      target: target,
      texts: textArray,
      startTime: Date.now()
    };
    
    this.currentTextIndex = 0;
    this.displayedText = '';
    this.typingTimer = 0;
    this.autoAdvanceTimer = 0;
    this.isTyping = true;
  },
  
  /**
   * 말풍선 숨기기
   */
  hide() {
    this.currentBubble = null;
    this.currentTextIndex = 0;
    this.displayedText = '';
    this.typingTimer = 0;
    this.autoAdvanceTimer = 0;
    this.isTyping = false;
  },
  
  /**
   * 다음 텍스트로 넘어가기
   */
  nextText() {
    if (!this.currentBubble) return;
    
    // 타이핑 중이면 즉시 완성
    if (this.isTyping) {
      this.displayedText = this.currentBubble.texts[this.currentTextIndex];
      this.isTyping = false;
      this.autoAdvanceTimer = 0;
      return;
    }
    
    // 다음 텍스트로
    this.currentTextIndex++;
    
    // 모든 텍스트를 표시했으면 말풍선 숨기기
    if (this.currentTextIndex >= this.currentBubble.texts.length) {
      this.hide();
      return;
    }
    
    // 다음 텍스트 타이핑 시작
    this.displayedText = '';
    this.typingTimer = 0;
    this.autoAdvanceTimer = 0;
    this.isTyping = true;
  },
  
  /**
   * 업데이트
   */
  update(dt) {
    if (!this.currentBubble) return;
    
    const currentText = this.currentBubble.texts[this.currentTextIndex];
    if (!currentText) return;
    
    // 타이핑 효과
    if (this.isTyping) {
      this.typingTimer += dt;
      const charsToShow = Math.floor(this.typingTimer / this.typingSpeed);
      
      if (charsToShow >= currentText.length) {
        // 타이핑 완료
        this.displayedText = currentText;
        this.isTyping = false;
        this.autoAdvanceTimer = 0;
      } else {
        this.displayedText = currentText.substring(0, charsToShow);
      }
    } else {
      // 타이핑 완료 후 자동 넘어가기
      this.autoAdvanceTimer += dt;
      if (this.autoAdvanceTimer >= this.autoAdvanceDelay) {
        this.nextText();
      }
    }
  },
  
  /**
   * 렌더링
   */
  render(ctx) {
    if (!this.currentBubble) return;
    
    const target = this.currentBubble.target;
    if (!target || !target.x || !target.y) return;
    
    const x = target.x;
    const y = target.y + this.bubbleOffsetY;
    
    // 텍스트 측정
    ctx.save();
    ctx.font = '14px Sam3KR, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = this.displayedText;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = 20;
    
    // 말풍선 크기 계산
    const bubbleWidth = Math.min(textWidth + this.bubblePadding * 2, this.maxWidth);
    const bubbleHeight = textHeight + this.bubblePadding * 2;
    
    // 말풍선 배경
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    
    // 말풍선 모양 (둥근 사각형)
    const radius = 8;
    
    ctx.beginPath();
    // 위쪽 둥근 모서리
    ctx.moveTo(x - bubbleWidth / 2 + radius, y - bubbleHeight / 2);
    ctx.lineTo(x + bubbleWidth / 2 - radius, y - bubbleHeight / 2);
    ctx.quadraticCurveTo(x + bubbleWidth / 2, y - bubbleHeight / 2, x + bubbleWidth / 2, y - bubbleHeight / 2 + radius);
    // 오른쪽
    ctx.lineTo(x + bubbleWidth / 2, y + bubbleHeight / 2 - radius);
    ctx.quadraticCurveTo(x + bubbleWidth / 2, y + bubbleHeight / 2, x + bubbleWidth / 2 - radius, y + bubbleHeight / 2);
    // 아래쪽
    ctx.lineTo(x - bubbleWidth / 2 + radius, y + bubbleHeight / 2);
    ctx.quadraticCurveTo(x - bubbleWidth / 2, y + bubbleHeight / 2, x - bubbleWidth / 2, y + bubbleHeight / 2 - radius);
    // 왼쪽
    ctx.lineTo(x - bubbleWidth / 2, y - bubbleHeight / 2 + radius);
    ctx.quadraticCurveTo(x - bubbleWidth / 2, y - bubbleHeight / 2, x - bubbleWidth / 2 + radius, y - bubbleHeight / 2);
    ctx.closePath();
    
    ctx.fill();
    ctx.stroke();
    
    // 텍스트 그리기
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x, y);
    
    // 다음 텍스트가 있으면 표시 (타이핑 완료 후)
    if (!this.isTyping && this.currentTextIndex < this.currentBubble.texts.length - 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '10px Sam3KR, Arial, sans-serif';
      ctx.fillText('(스페이스바)', x, y + bubbleHeight / 2 + 5);
    }
    
    ctx.restore();
  },
  
  /**
   * 말풍선이 표시 중인지 확인
   */
  isActive() {
    return this.currentBubble !== null;
  }
};

