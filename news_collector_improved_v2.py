#!/usr/bin/env python3
"""
실제 뉴스만 수집하는 개선된 뉴스 수집기
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

class NewsCollectorV2:
    def __init__(self):
        """뉴스 수집기 초기화"""
        self.collected_news = []
        self.firebase_db = None
        self.news_api_key = os.getenv('NEWS_API_KEY')
        self._init_firebase()
    
    def _init_firebase(self):
        """Firebase 초기화"""
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate("firebase/serviceAccountKey.json")
                firebase_admin.initialize_app(cred)
                print("✅ Firebase 연결 성공")
            self.firebase_db = firestore.client()
        except Exception as e:
            print(f"❌ Firebase 초기화 실패: {e}")
            raise
    
    def search_google_news_rss(self, keyword: str, language: str = 'ko') -> List[Dict[str, Any]]:
        """Google News RSS에서 뉴스 검색"""
        try:
            print(f"🔍 Google News RSS 검색 시작: {keyword}")
            
            # Google News RSS URL
            url = f"https://news.google.com/rss/search?q={keyword}&hl={language}&gl=KR&ceid=KR:{language}"
            
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            # XML 파싱 (간단한 방식)
            import xml.etree.ElementTree as ET
            root = ET.fromstring(response.content)
            
            articles = []
            for item in root.findall('.//item'):
                title = item.find('title').text if item.find('title') is not None else ''
                link = item.find('link').text if item.find('link') is not None else ''
                pub_date = item.find('pubDate').text if item.find('pubDate') is not None else ''
                description = item.find('description').text if item.find('description') is not None else ''
                
                # 소스 추출
                source = ''
                source_elem = item.find('source')
                if source_elem is not None:
                    source = source_elem.text or ''
                
                # 중복 제거를 위한 고유 ID 생성
                article_id = hashlib.md5(f"{title}{link}".encode()).hexdigest()
                
                article = {
                    'id': article_id,
                    'title': title,
                    'link': link,
                    'source': source,
                    'published_at': pub_date,
                    'description': description,
                    'keyword': keyword,
                    'collected_at': datetime.now().isoformat()
                }
                
                articles.append(article)
            
            print(f"✅ Google News RSS에서 {len(articles)}개의 뉴스를 수집했습니다.")
            return articles
            
        except Exception as e:
            print(f"❌ Google News RSS 검색 실패: {e}")
            return []
    
    def remove_duplicates(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """중복 제거"""
        seen = set()
        unique_articles = []
        
        for article in articles:
            article_id = article['id']
            if article_id not in seen:
                seen.add(article_id)
                unique_articles.append(article)
        
        print(f"🔄 중복 제거: {len(articles)} → {len(unique_articles)}")
        return unique_articles
    
    def save_to_excel(self, articles: List[Dict[str, Any]], filename: str = None) -> str:
        """엑셀 파일로 저장"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"news_data_{timestamp}.xlsx"
        
        df = pd.DataFrame(articles)
        df.to_excel(filename, index=False)
        print(f"✅ 엑셀 파일 저장 완료: {filename}")
        return filename
    
    def upload_to_firebase(self, articles: List[Dict[str, Any]]) -> bool:
        """Firebase Firestore에 업로드"""
        try:
            batch = self.firebase_db.batch()
            collection_ref = self.firebase_db.collection('news')
            
            for article in articles:
                doc_ref = collection_ref.document(article['id'])
                batch.set(doc_ref, article)
            
            batch.commit()
            print(f"✅ Firebase 업로드 완료: {len(articles)}개 문서")
            return True
            
        except Exception as e:
            print(f"❌ Firebase 업로드 실패: {e}")
            return False
    
    def collect_news(self, keywords: List[str], save_excel: bool = True, upload_firebase: bool = True) -> Dict[str, Any]:
        """뉴스 수집 메인 함수"""
        print("🚀 실제 뉴스만 수집하는 뉴스 수집기 시작")
        
        all_articles = []
        failed_keywords = []
        
        for keyword in keywords:
            try:
                print(f"\n🔍 키워드 '{keyword}' 검색 중...")
                articles = self.search_google_news_rss(keyword)
                
                if articles:
                    all_articles.extend(articles)
                else:
                    failed_keywords.append(keyword)
                    print(f"❌ 키워드 '{keyword}' 검색 실패")
                    
            except Exception as e:
                print(f"❌ 키워드 '{keyword}' 처리 중 오류: {e}")
                failed_keywords.append(keyword)
        
        # 중복 제거
        unique_articles = self.remove_duplicates(all_articles)
        
        # 결과 저장
        excel_file = None
        firebase_uploaded = False
        
        if save_excel and unique_articles:
            excel_file = self.save_to_excel(unique_articles)
        
        if upload_firebase and unique_articles:
            firebase_uploaded = self.upload_to_firebase(unique_articles)
        
        # 결과 반환
        result = {
            'total_collected': len(all_articles),
            'total_unique': len(unique_articles),
            'keywords': keywords,
            'failed_keywords': failed_keywords,
            'excel_file': excel_file,
            'firebase_uploaded': firebase_uploaded,
            'message': '뉴스 수집이 완료되었습니다.' if unique_articles else '수집된 뉴스가 없습니다.'
        }
        
        print(f"\n📊 수집 결과:")
        print(f"  - 총 수집: {result['total_collected']}개")
        print(f"  - 중복 제거 후: {result['total_unique']}개")
        print(f"  - 성공한 키워드: {len(keywords) - len(failed_keywords)}개")
        print(f"  - 실패한 키워드: {len(failed_keywords)}개")
        if excel_file:
            print(f"  - 엑셀 파일: {excel_file}")
        print(f"  - Firebase 업로드: {'성공' if firebase_uploaded else '실패'}")
        
        print("\n✅ 뉴스 수집 완료!")
        return result

def main():
    """메인 실행 함수"""
    collector = NewsCollectorV2()
    
    # 검색 키워드
    keywords = ["AI", "인공지능", "기술", "경제", "주식", "부동산"]
    
    # 뉴스 수집 실행
    result = collector.collect_news(
        keywords=keywords,
        save_excel=True,
        upload_firebase=True
    )
    
    # 결과 출력
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main() 