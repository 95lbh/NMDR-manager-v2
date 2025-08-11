import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 연결 테스트 함수
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Supabase 연결 오류:', error)
      return { success: false, error: error.message }
    }
    
    console.log('Supabase 연결 성공!')
    return { success: true, data }
  } catch (error) {
    console.error('Supabase 연결 테스트 실패:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류' 
    }
  }
}
