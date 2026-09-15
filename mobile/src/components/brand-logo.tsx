import { Image } from 'expo-image';
import {
  StyleSheet,
  View,
} from 'react-native';

type BrandLogoProps = {
  width?: number;
};

const logoSource = require(
  '../../assets/images/grandwall-wordmark.png',
);

export function BrandLogo({
  width = 280,
}: BrandLogoProps) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="GrandWall"
      style={[
        styles.container,
        {
          width,
          height: width / 3,
        },
      ]}
    >
      <Image
        source={logoSource}
        contentFit="contain"
        transition={150}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
  },

  image: {
    width: '100%',
    height: '100%',
  },
});
