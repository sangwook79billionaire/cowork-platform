#!/usr/bin/env python3
"""
뉴스 수집기 - Google News RSS를 수집하여 엑셀로 저장하고 Firebase에 업로드
"""

import os
import json
import requests
import feedparser
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import hashlib
import re

# 환경 변수 로드
load_dotenv()

class NewsCollector:
    def __init__(self):
        """뉴스 수집기 초기화"""
        self.base_url = "https://news.google.com/rss"
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
    
    def search_google_news(self, keywords: str, language: str = "ko") -> List[Dict[str, Any]]:
        """Google News RSS에서 뉴스 검색"""
        try:
            print(f"🔍 뉴스 검색 시작: {keywords}")
            
            # Google News RSS URL 구성
            encoded_keywords = requests.utils.quote(keywords)
            rss_url = f"{self.base_url}/search?q={encoded_keywords}&hl={language}&gl=KR&ceid=KR:ko"
            
            print(f"📡 RSS URL: {rss_url}")
            
            # RSS 피드 파싱
            feed = feedparser.parse(rss_url)
            
            if not feed.entries:
                print("❌ 뉴스를 찾을 수 없습니다.")
                return []
            
            articles = []
            for i, entry in enumerate(feed.entries):
                # 제목에서 HTML 태그 제거
                title = re.sub(r'<[^>]+>', '', entry.title)
                
                # 설명에서 HTML 태그 제거
                description = ""
                if hasattr(entry, 'summary'):
                    description = re.sub(r'<[^>]+>', '', entry.summary)
                
                # 출처 추출
                source_name = "Google News"
                if hasattr(entry, 'source') and entry.source:
                    source_name = entry.source.title
                
                # 링크 정리
                link = entry.link
                if link.startswith('./'):
                    link = f"https://news.google.com{link[1:]}"
                
                article = {
                    'id': f"google-{hashlib.md5((title + link).encode()).hexdigest()[:8]}",
                    'title': title,
                    'description': description,
                    'content': description,  # AI 요약 대신 description 사용
                    'url': link,
                    'publishedAt': datetime.now().isoformat(),
                    'source': {
                        'name': source_name,
                        'id': 'google-news'
                    },
                    'keywords': keywords,
                    'collectedAt': datetime.now().isoformat()
                }
                
                articles.append(article)
            
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
                    '키워드': article['keywords'],
                    '수집일시': article['collectedAt']
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
            articles = self.search_google_news(keyword)
            all_articles.extend(articles)
        
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
    print("🚀 뉴스 수집기 시작")
    
    # 수집할 키워드 목록
    keywords = ["AI", "인공지능", "기술", "경제", "주식", "부동산"]
    
    # 뉴스 수집기 초기화
    collector = NewsCollector()
    
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