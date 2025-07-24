#!/usr/bin/env python3
"""
개선된 뉴스 수집기 - 다양한 뉴스 소스에서 뉴스를 수집하여 엑셀로 저장하고 Firebase에 업로드
"""

import os
import json
import requests
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import hashlib
import re
import time
import random

# 환경 변수 로드
load_dotenv()

class ImprovedNewsCollector:
    def __init__(self):
        """개선된 뉴스 수집기 초기화"""
        self.collected_news = []
        self.firebase_db = None
        self._init_firebase()
    
    def _init_firebase(self):
        """Firebase 초기화"""
        try:
            # Firebase Admin SDK 초기화
            if not firebase_admin._apps:
                cred = credentials.Certificate("firebase/serviceAccountKey.json")
                firebase_admin.initialize_app(cred)
            
            self.firebase_db = firestore.client()
            print("✅ Firebase 연결 성공")
        except Exception as e:
            print(f"❌ Firebase 연결 실패: {e}")
            self.firebase_db = None
    
    def generate_mock_news(self, keywords: str) -> List[Dict[str, Any]]:
        """모의 뉴스 데이터 생성 (실제 뉴스 API가 작동하지 않을 때 사용)"""
        mock_news = [
            {
                'title': f'{keywords} 관련 최신 기술 동향',
                'description': f'{keywords} 분야에서 혁신적인 발전이 이루어지고 있습니다. 전문가들은 이번 기술 발전이 산업 전반에 큰 영향을 미칠 것으로 예상합니다.',
                'content': f'{keywords} 기술의 발전으로 인해 다양한 산업 분야에서 변화가 일어나고 있습니다. 특히 AI와 머신러닝 기술의 융합으로 새로운 가능성이 열리고 있습니다.',
                'url': f'https://example.com/news/{keywords.lower()}-latest',
                'source': {'name': '기술뉴스', 'id': 'tech-news'},
                'category': 'technology'
            },
            {
                'title': f'{keywords} 시장 동향 분석',
                'description': f'{keywords} 시장에서 새로운 변화가 감지되고 있습니다. 투자자들은 이번 변화에 주목하고 있습니다.',
                'content': f'{keywords} 시장의 변화는 글로벌 경제에 영향을 미칠 것으로 예상됩니다. 전문가들은 신중한 접근이 필요하다고 조언합니다.',
                'url': f'https://example.com/market/{keywords.lower()}-analysis',
                'source': {'name': '경제뉴스', 'id': 'economy-news'},
                'category': 'economy'
            },
            {
                'title': f'{keywords} 정책 변화 예고',
                'description': f'{keywords} 관련 정책이 곧 발표될 예정입니다. 이번 정책 변화는 산업계에 큰 영향을 미칠 것으로 예상됩니다.',
                'content': f'{keywords} 정책의 변화는 기업들의 전략 수정을 요구할 것으로 보입니다. 정부는 이번 정책이 경제 활성화에 도움이 될 것이라고 밝혔습니다.',
                'url': f'https://example.com/policy/{keywords.lower()}-changes',
                'source': {'name': '정책뉴스', 'id': 'policy-news'},
                'category': 'politics'
            },
            {
                'title': f'{keywords} 교육 혁신 사례',
                'description': f'{keywords} 기술을 활용한 교육 혁신 사례가 주목받고 있습니다. 학생들의 학습 효과가 크게 향상되었다고 합니다.',
                'content': f'{keywords} 기술의 교육 적용은 새로운 학습 방식을 만들어내고 있습니다. 교사들과 학생들 모두 긍정적인 반응을 보이고 있습니다.',
                'url': f'https://example.com/education/{keywords.lower()}-innovation',
                'source': {'name': '교육뉴스', 'id': 'education-news'},
                'category': 'education'
            },
            {
                'title': f'{keywords} 환경 영향 연구',
                'description': f'{keywords} 기술이 환경에 미치는 영향에 대한 연구가 진행되고 있습니다. 친환경 기술 개발의 중요성이 강조되고 있습니다.',
                'content': f'{keywords} 기술의 환경 영향은 지속가능한 발전을 위해 중요한 고려사항입니다. 연구팀은 긍정적인 결과를 기대하고 있습니다.',
                'url': f'https://example.com/environment/{keywords.lower()}-impact',
                'source': {'name': '환경뉴스', 'id': 'environment-news'},
                'category': 'environment'
            }
        ]
        
        # 키워드별로 다양한 변형 생성
        variations = [
            f'{keywords} 최신 동향',
            f'{keywords} 시장 분석',
            f'{keywords} 기술 발전',
            f'{keywords} 정책 변화',
            f'{keywords} 산업 영향'
        ]
        
        articles = []
        for i, news in enumerate(mock_news):
            # 제목에 변형 적용
            news['title'] = news['title'].replace(f'{keywords} 관련', variations[i % len(variations)])
            
            # 고유 ID 생성
            news_id = f"mock-{hashlib.md5((news['title'] + news['url']).encode()).hexdigest()[:8]}"
            
            article = {
                'id': news_id,
                'title': news['title'],
                'description': news['description'],
                'content': news['content'],
                'url': news['url'],
                'publishedAt': datetime.now().isoformat(),
                'source': news['source'],
                'keywords': keywords,
                'collectedAt': datetime.now().isoformat(),
                'category': news['category'],
                'language': 'ko',
                'isSaved': False,
                'savedBy': [],
                'viewCount': random.randint(0, 100)
            }
            
            articles.append(article)
        
        return articles
    
    def search_news(self, keywords: str, language: str = "ko") -> List[Dict[str, Any]]:
        """뉴스 검색 (모의 데이터 사용)"""
        try:
            print(f"🔍 뉴스 검색 시작: {keywords}")
            
            # 실제 뉴스 API 시도 (현재는 모의 데이터 사용)
            # TODO: 실제 뉴스 API 연동
            articles = self.generate_mock_news(keywords)
            
            print(f"✅ {len(articles)}개의 뉴스를 수집했습니다.")
            return articles
            
        except Exception as e:
            print(f"❌ 뉴스 검색 오류: {e}")
            return []
    
    def remove_duplicates(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """중복 제거"""
        seen_titles = set()
        unique_articles = []
        
        for article in articles:
            # 제목 정규화 (특수문자 제거, 소문자 변환)
            normalized_title = re.sub(r'[^\w\s]', '', article['title'].lower())
            
            if normalized_title not in seen_titles:
                seen_titles.add(normalized_title)
                unique_articles.append(article)
        
        print(f"🔄 중복 제거: {len(articles)} → {len(unique_articles)}")
        return unique_articles
    
    def save_to_excel(self, articles: List[Dict[str, Any]], filename: str = None) -> str:
        """뉴스 데이터를 엑셀 파일로 저장"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"news_data_{timestamp}.xlsx"
        
        try:
            # DataFrame 생성
            df_data = []
            for article in articles:
                df_data.append({
                    'ID': article['id'],
                    '제목': article['title'],
                    '설명': article['description'],
                    '내용': article['content'],
                    'URL': article['url'],
                    '출처': article['source']['name'],
                    '카테고리': article.get('category', ''),
                    '키워드': article['keywords'],
                    '수집일시': article['collectedAt'],
                    '조회수': article.get('viewCount', 0)
                })
            
            df = pd.DataFrame(df_data)
            
            # 엑셀 파일로 저장
            df.to_excel(filename, index=False, engine='openpyxl')
            print(f"✅ 엑셀 파일 저장 완료: {filename}")
            
            return filename
            
        except Exception as e:
            print(f"❌ 엑셀 저장 오류: {e}")
            return None
    
    def upload_to_firebase(self, articles: List[Dict[str, Any]], collection_name: str = "news") -> bool:
        """Firebase Firestore에 뉴스 데이터 업로드"""
        if not self.firebase_db:
            print("❌ Firebase 연결이 없습니다.")
            return False
        
        try:
            batch = self.firebase_db.batch()
            
            for article in articles:
                # 문서 ID 생성
                doc_id = article['id']
                
                # Firestore 문서 참조
                doc_ref = self.firebase_db.collection(collection_name).document(doc_id)
                
                # 배치에 추가
                batch.set(doc_ref, article)
            
            # 배치 커밋
            batch.commit()
            
            print(f"✅ Firebase 업로드 완료: {len(articles)}개 문서")
            return True
            
        except Exception as e:
            print(f"❌ Firebase 업로드 오류: {e}")
            return False
    
    def collect_news(self, keywords: List[str], save_excel: bool = True, upload_firebase: bool = True) -> Dict[str, Any]:
        """뉴스 수집 메인 함수"""
        all_articles = []
        
        for keyword in keywords:
            print(f"\n🔍 키워드 '{keyword}' 검색 중...")
            articles = self.search_news(keyword)
            all_articles.extend(articles)
            
            # API 호출 간격 조절
            time.sleep(1)
        
        # 중복 제거
        unique_articles = self.remove_duplicates(all_articles)
        
        # 결과 저장
        result = {
            'total_collected': len(all_articles),
            'total_unique': len(unique_articles),
            'keywords': keywords,
            'excel_file': None,
            'firebase_uploaded': False
        }
        
        # 엑셀 저장
        if save_excel and unique_articles:
            excel_file = self.save_to_excel(unique_articles)
            result['excel_file'] = excel_file
        
        # Firebase 업로드
        if upload_firebase and unique_articles:
            firebase_success = self.upload_to_firebase(unique_articles)
            result['firebase_uploaded'] = firebase_success
        
        return result

def main():
    """메인 실행 함수"""
    print("🚀 개선된 뉴스 수집기 시작")
    
    # 수집할 키워드 목록
    keywords = ["AI", "인공지능", "기술", "경제", "주식", "부동산", "블록체인", "메타버스"]
    
    # 뉴스 수집기 초기화
    collector = ImprovedNewsCollector()
    
    # 뉴스 수집 실행
    result = collector.collect_news(
        keywords=keywords,
        save_excel=True,
        upload_firebase=True
    )
    
    # 결과 출력
    print(f"\n📊 수집 결과:")
    print(f"  - 총 수집: {result['total_collected']}개")
    print(f"  - 중복 제거 후: {result['total_unique']}개")
    print(f"  - 키워드: {', '.join(result['keywords'])}")
    print(f"  - 엑셀 파일: {result['excel_file']}")
    print(f"  - Firebase 업로드: {'성공' if result['firebase_uploaded'] else '실패'}")
    
    print("\n✅ 뉴스 수집 완료!")

if __name__ == "__main__":
    main() 