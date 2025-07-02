// IP地理位置检测工具
export interface GeoLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  isJapan: boolean;
}

// 解析Cloudflare trace数据
function parseCloudflareTrace(traceText: string): GeoLocation {
  const lines = traceText.split('\n');
  const data: Record<string, string> = {};
  
  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      data[key.trim()] = value.trim();
    }
  });

  const loc = data.loc || 'XX';
  const isJapan = loc === 'JP';

  return {
    country: isJapan ? 'Japan' : (data.loc || 'Unknown'),
    countryCode: loc,
    region: data.loc || 'Unknown',
    city: data.colo || 'Unknown',
    isJapan
  };
}

// 检测地理位置（使用Cloudflare trace）
export async function detectGeoLocation(): Promise<GeoLocation> {
  // 检查是否在浏览器环境中
  if (typeof window === 'undefined') {
    // 服务器端/构建时返回默认值
    return {
      country: 'Japan',
      countryCode: 'JP',
      region: 'Tokyo',
      city: 'HKG',
      isJapan: true // 构建时默认为日本
    };
  }

  try {
    // 使用Cloudflare的trace接口
    const response = await fetch('/cdn-cgi/trace');
    const traceText = await response.text();
    
    return parseCloudflareTrace(traceText);
  } catch (error) {
    console.error('Cloudflare trace检测失败:', error);
    
    // 浏览器环境失败时的默认值
    return {
      country: 'Japan',
      countryCode: 'JP',
      region: 'Tokyo',
      city: 'HKG',
      isJapan: true // 开发环境默认为日本用于测试
    };
  }
}

// 检查是否有强制显示家宽的参数
export function checkForceShowBroadband(url: URL): boolean {
  return url.searchParams.has('force_broadband') || url.pathname === '/force-broadband-access';
}

// 判断是否应该显示家庭宽带内容（考虑强制参数）
export function shouldShowBroadband(geoLocation: GeoLocation, url?: URL): boolean {
  // 如果有强制参数，总是显示家宽
  if (url && checkForceShowBroadband(url)) {
    return true;
  }
  // 否则根据地理位置判断
  return !geoLocation.isJapan;
}

// 判断是否应该突出显示企业服务
export function shouldHighlightEnterpriseServices(geoLocation: GeoLocation, url?: URL): boolean {
  // 如果有强制参数，不突出显示企业服务
  if (url && checkForceShowBroadband(url)) {
    return false;
  }
  return geoLocation.isJapan;
}
