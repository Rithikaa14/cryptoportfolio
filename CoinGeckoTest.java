import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;

public class CoinGeckoTest {
    public static void main(String[] args) throws Exception {
        String[] symbols = {"BTC", "ETH", "ETC", "DOT", "ADA", "MNC", "RUG"};
        System.out.println("Testing CoinGecko Live Prices...");
        
        // Simulating getCoinGeckoId logic
        Map<String, String> symbolMap = new HashMap<>();
        symbolMap.put("BTC", "bitcoin");
        symbolMap.put("ETH", "ethereum");
        symbolMap.put("SOL", "solana");
        symbolMap.put("ADA", "cardano");
        symbolMap.put("DOGE", "dogecoin");
        symbolMap.put("AVAX", "avalanche-2");
        symbolMap.put("DOT", "polkadot");
        symbolMap.put("LINK", "chainlink");
        symbolMap.put("BNB", "binancecoin");
        symbolMap.put("MATIC", "polygon");
        symbolMap.put("XRP", "ripple");
        symbolMap.put("USDC", "usd-coin");
        symbolMap.put("USDT", "tether");
        symbolMap.put("ETC", "ethereum-classic");

        List<String> ids = new ArrayList<>();
        for (String s : symbols) {
            String id = symbolMap.getOrDefault(s.toUpperCase(), s.toLowerCase());
            ids.add(id);
        }

        String urlStr = "https://api.coingecko.com/api/v3/simple/price?ids=" + String.join(",", ids) + "&vs_currencies=usd";
        System.out.println("URL: " + urlStr);

        try {
            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.connect();

            int responseCode = conn.getResponseCode();
            System.out.println("Response Code: " + responseCode);

            if (responseCode == 200) {
                Scanner sc = new Scanner(url.openStream());
                StringBuilder inline = new StringBuilder();
                while (sc.hasNext()) {
                    inline.append(sc.nextLine());
                }
                sc.close();
                System.out.println("JSON Response: " + inline.toString());
            } else if (responseCode == 429) {
                System.out.println("ERROR: Rate Limited (429)");
            } else {
                System.out.println("ERROR: Received code " + responseCode);
            }
        } catch (Exception e) {
            System.out.println("CONNECTION ERROR: " + e.getMessage());
        }
    }
}
